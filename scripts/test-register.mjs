import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./test-hooks.mjs", import.meta.url).href, pathToFileURL("./"));
