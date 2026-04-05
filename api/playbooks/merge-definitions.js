'use strict';
const YAML = require('yaml');
const fs = require('fs');
class MergeDefinitions {
    constructor() {}
    writeFile(filename, data) {
        fs.writeFileSync(filename, YAML.stringify(data, { lineWidth: 0 }).trimEnd());
        console.log("wrote file " + filename);
    }
    readFile(filename) {
        const rawYaml = fs.readFileSync(filename);
        console.log("read file " + filename);
        return YAML.parse(rawYaml.toString());
    }
    run(args) {
        if (args.length < 3) {
            console.error("please specify an input file");
            return;
        }
        if (args[2] === "") {
            console.error("input file not specified");
            return;
        }
        const parsed = this.readFile(args[2]);
        const schemas = this.readFile("schemas.yaml");
        const responses = this.readFile("responses.yaml");
        const securitySchemes = this.readFile("securitySchemes.yaml");
        parsed["components"]["schemas"] = Object.assign(parsed["components"]["schemas"], schemas);
        parsed["components"]["responses"] = Object.assign(parsed["components"]["responses"], responses);
        parsed["components"]["securitySchemes"] = Object.assign(parsed["components"]["securitySchemes"], securitySchemes);
        this.writeFile("merged-definitions.yaml", parsed);
    }
}
new MergeDefinitions().run(process.argv);