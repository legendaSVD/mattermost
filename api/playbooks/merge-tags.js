'use strict';
const YAML = require('yaml');
const fs = require('fs');
class MergeTags {
    constructor() {}
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
        const tags = this.readFile("tags.yaml");
        if ("tags" in parsed) {
            parsed["tags"].push(...tags["tags"]);
        }
        if ("x-tagGroups" in parsed) {
            parsed["x-tagGroups"].push(...tags["x-tagGroups"]);
        }
        const yamlString =
            YAML.stringify(parsed, { lineWidth: 0 }).
                replace(/^paths:.*null.*$/mg, "paths: ");
        fs.writeFileSync("merged-tags.yaml", yamlString);
        console.log("wrote file merged-tags.yaml");
    }
}
new MergeTags().run(process.argv);