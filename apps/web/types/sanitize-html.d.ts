declare module 'sanitize-html' {
	export interface IOptions {
		allowedTags?: string[];
		allowedAttributes?: { [key: string]: string[] };
		allowedSchemes?: string[];
		allowedSchemesByTag?: { [key: string]: string[] };
		allowedSchemesAppliedToAttributes?: string[];
		allowProtocolRelative?: boolean;
		enforceHtmlBoundary?: boolean;
		allowedClasses?: { [key: string]: string[] };
		allowedStyles?: { [key: string]: { [key: string]: RegExp[] } };
		allowedIframeHostnames?: string[];
		allowedIframeDomains?: string[];
		allowedScriptDomains?: string[];
		allowedScriptHostnames?: string[];
		transformTags?: { [key: string]: string | ((tagName: string, attribs: any) => any) };
		exclusiveFilter?: (frame: any) => boolean;
		nonTextTags?: string[];
		textFilter?: (text: string) => string;
		allowedNamespaces?: string[];
		nonBooleanAttributes?: string[];
		selfClosing?: string[];
		allowedUrlPattern?: RegExp;
		allowedUrlSchemes?: string[];
		allowedUrlSchemesByTag?: { [key: string]: string[] };
		allowedUrlSchemesAppliedToAttributes?: string[];
		parseStyleAttributes?: boolean;
		exclusiveFilter?: (frame: any) => boolean;
		allowedStyles?: { [key: string]: { [key: string]: RegExp[] } };
		allowedAttributes?: { [key: string]: string[] };
		allowedTags?: string[];
		allowedClasses?: { [key: string]: string[] };
		allowedIframeHostnames?: string[];
		allowedIframeDomains?: string[];
		allowedScriptDomains?: string[];
		allowedScriptHostnames?: string[];
		transformTags?: { [key: string]: string | ((tagName: string, attribs: any) => any) };
		nonTextTags?: string[];
		textFilter?: (text: string) => string;
		allowedNamespaces?: string[];
		nonBooleanAttributes?: string[];
		selfClosing?: string[];
		allowedUrlPattern?: RegExp;
		allowedUrlSchemes?: string[];
		allowedUrlSchemesByTag?: { [key: string]: string[] };
		allowedUrlSchemesAppliedToAttributes?: string[];
		parseStyleAttributes?: boolean;
	}
	
	function sanitize(html: string, options?: IOptions): string;
	export default sanitize;
}





