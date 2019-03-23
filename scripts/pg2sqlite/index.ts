import { Client } from 'pg';
import chalk from 'chalk';
import sqlite from 'sqlite';

const sqliteDBName = process.env.SQLITE_DB_NAME || Math.floor((Math.random() * 100000)).toString(16);

const queryString = (table: string): string => {
    return `
        SELECT 
            t.gid AS id,
            st_xmin(t.geom::box3d) AS minx,
            st_xmax(t.geom::box3d) AS maxx,
            st_ymin(t.geom::box3d) AS miny,
            st_ymax(t.geom::box3d) AS maxy,
            st_astwkb(t.geom, 5) AS boundary
        FROM ${table} as t
    `;
}

const insert = async (client: Client, db: any, table: string) => {
    const { rows } = await client.query(queryString(table));
    console.log(chalk.green(`✅ ${table} query: ${rows.length} results`));
    for (let row of rows) {
        const { boundary } = row;
        const _boundary = Buffer.from(boundary);
        await db.run(`INSERT INTO ${table}_idx
        (id, minx, maxx, miny, maxy, boundary) 
        values ($id, $minx, $maxx, $miny, $maxy, CAST($boundary AS BLOB))`, {
            $id: row.id,
            $minx: row.minx,
            $maxx: row.maxx,
            $miny: row.miny,
            $maxy: row.maxy,
            $boundary: _boundary
        });
    }
}


async function main() {
    console.log(chalk.bold('Begining pg2sqlite export'));

    const client = new Client({
        database: 'bike_streets'
    });

    try {
        await client.connect();
        console.log(chalk.green('✅ PG database connection'));

        const db = await sqlite.open(`./${sqliteDBName}.sqlite`);
        console.log(chalk.green('✅ SQLite db created -', sqliteDBName));

        // As of sqlite v3.24+ rtree indexes can have additional columns, denoted with a +
        await db.run('create virtual table bike_path_idx using rtree(id, minX, maxX, minY, maxY, +boundary BLOB)');
        await db.run('create virtual table walk_path_idx using rtree(id, minX, maxX, minY, maxY, +boundary BLOB)');
        console.log(chalk.green('✅ SQLite schema created'));
        
        console.log(chalk.green(`✅ SQLite tract values populated`));

        await insert(client, db, 'bike_path');
        console.log(chalk.green(`✅ SQLite bike_path values populated`));

        await insert(client, db, 'walk_path');
        console.log(chalk.green(`✅ SQLite walk_path values populated`));

        console.log(chalk.bold.green(`✅ Success | ${sqliteDBName}.sqlite`));
    } catch (error ) {
        console.error(chalk.red.bold(error));
    } finally {
        client.end();
    }
}

main();