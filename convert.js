var tj = require('@mapbox/togeojson')
var fs = require('fs')
var DOMParser = require('xmldom').DOMParser;

maps = ["1-bikestreets-master-v0.3","2-trails-master-v0.3","3-bikelanes-master-v0.3","4-bikesidewalks-master-v0.3","5-walk-master-v0.3"]

for( map in maps){
	mapName = (maps[map])
	var kml = new DOMParser().parseFromString(fs.readFileSync(`kml/${mapName}.kml`, 'utf8'));
	
	var converted = tj.kml(kml);
	fs.writeFile(`geojson/${mapName}.geojson`, JSON.stringify(converted), function(err){
 		if(err) return console.log(err)
		console.log(`file written`)
	})
}
