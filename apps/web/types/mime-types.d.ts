declare module 'mime-types' {
	export function lookup(path: string): string | false;
	export function contentType(filenameOrExt: string): string | false;
	export function extension(type: string): string | false;
	export function charset(type: string): string | false;
	
	interface MimeTypes {
		lookup: typeof lookup;
		contentType: typeof contentType;
		extension: typeof extension;
		charset: typeof charset;
	}
	
	const mime: MimeTypes;
	export default mime;
}

