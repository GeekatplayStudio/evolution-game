import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [{
	ignores: ["**/._*"],
}, ...nextCoreWebVitals, ...nextTypeScript];

export default config;
