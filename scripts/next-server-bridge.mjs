import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const requestModule = require("next/dist/server/web/spec-extension/request");
const responseModule = require("next/dist/server/web/spec-extension/response");

export const NextRequest = requestModule.NextRequest;
export const NextResponse = responseModule.NextResponse;
export default { NextRequest, NextResponse };
