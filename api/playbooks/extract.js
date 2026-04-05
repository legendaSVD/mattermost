'use strict';
const YAML = require('yaml');
const fs = require('fs');
const fetch = require('sync-fetch');
class Extractor {
    constructor() {}
    writeFile(filename, data, indent = 0) {
        let stringified = YAML.stringify(data, { lineWidth: 0 });
        if (indent > 0) {
            stringified = stringified.replace(/^(.*)$/mg, '$1'.padStart(2 + indent)) + "\n";
        }
        fs.writeFileSync(filename, stringified);
        console.log("wrote file " + filename);
    }
    run(args) {
        const rawSpec = fetch('https://raw.githubusercontent.com/mattermost/mattermost-plugin-playbooks/master/server/api/api.yaml').text();
        console.log("fetched Playbooks OpenAPI spec");
        const parsed = YAML.parse(rawSpec);
        if ("paths" in parsed) {
            this.writeFile("paths.yaml", parsed["paths"], 2);
        }
        if ("components" in parsed) {
            const components = parsed["components"];
            if ("schemas" in components) {
                this.writeFile("schemas.yaml", components["schemas"]);
            }
            if ("responses" in components) {
                this.writeFile("responses.yaml", components["responses"]);
            }
            if ("securitySchemes" in components) {
                this.writeFile("securitySchemes.yaml", components["securitySchemes"]);
            }
        }
    }
}
new Extractor().run(process.argv);