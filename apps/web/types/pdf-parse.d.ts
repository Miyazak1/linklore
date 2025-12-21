declare module 'pdf-parse' {
	export interface PDFInfo {
		PDFFormatVersion?: string;
		IsAcroFormPresent?: boolean;
		IsXFAPresent?: boolean;
		Title?: string;
		Author?: string;
		Subject?: string;
		Keywords?: string;
		Creator?: string;
		Producer?: string;
		CreationDate?: string;
		ModDate?: string;
		Trapped?: string;
	}

	export interface PDFMetadata {
		info: PDFInfo;
		metadata: any;
	}

	export interface PDFData {
		numpages: number;
		numrender: number;
		info: PDFInfo;
		metadata: PDFMetadata | null;
		text: string;
		version: string;
	}

	function pdfParse(dataBuffer: Buffer, options?: { max?: number; version?: string }): Promise<PDFData>;
	export default pdfParse;
}

