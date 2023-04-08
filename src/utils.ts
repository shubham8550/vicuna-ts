import { homedir } from 'os'
import { join } from 'path'
import { ConstructorOptions } from './types'

export const vicunaDir = (...subpaths: string[]): string => join(homedir(), '.vicuna-ts', ...subpaths)

const defaultOptions: ConstructorOptions = {
    model: 'ggml-vicuna-7b-4bit-rev1', 
    executablePath: vicunaDir('main.exe'),
    forceDownload: false,
    decoderConfig: {},
    modelOverride: false,
    callback: () => true,
    modelPath: ''
}

export const getOptions = (options: Partial<ConstructorOptions>): ConstructorOptions => {
    const finalOptions = Object.assign({}, defaultOptions, options)
    if (!finalOptions.modelPath) finalOptions.modelPath = vicunaDir(finalOptions.model.concat('.bin'))
    return finalOptions
}
