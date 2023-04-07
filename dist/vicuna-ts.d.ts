export interface ConstructorOptions {
    model: "ggml-vicuna-13b-4bit-rev1" | "ggml-vicuna-7b-4bit-rev1";
    executablePath?: string;
    modelPath?: string;
    callback?: (token: any) => void;
    forceDownload?: boolean;
    decoderConfig?: Record<string, any>;
    modelOverride?: boolean;
}
export declare class VICUNA {
    options: ConstructorOptions;
    private bot;
    private model;
    private decoderConfig;
    private executablePath;
    private modelPath;
    constructor(options: ConstructorOptions);
    init(forceDownload?: boolean): Promise<void>;
    open(): Promise<void>;
    close(): void;
    private downloadExecutable;
    private downloadModel;
    private downloadFile;
    prompt(prompt: string): Promise<string>;
}
