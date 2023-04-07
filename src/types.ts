export type SupportedModels = 'ggml-vicuna-13b-4bit-rev1' | 'ggml-vicuna-7b-4bit-rev1'

export interface ConstructorOptions {
    model: SupportedModels
    executablePath?: string
    modelPath?: string
    callback?: (token: string) => void
    forceDownload?: boolean
    decoderConfig?: Record<string, unknown>
    modelOverride?: boolean
}
