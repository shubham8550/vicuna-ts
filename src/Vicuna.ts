/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
import { spawn } from 'child_process'
import { chmod, mkdir } from 'fs/promises'
import * as os from 'os'
import axios from 'axios'
import ProgressBar = require('progress')
import { ConstructorOptions, SupportedModels } from './types'
import { createWriteStream, existsSync } from 'fs'

import { getOptions, vicunaDir } from './utils'

export class VICUNA implements Partial<ConstructorOptions> {
    private bot: ReturnType<typeof spawn> | null = null
    private _model!: SupportedModels
    private _decoderConfig!: Record<string, unknown>
    private _executablePath!: string
    private _modelPath!: string
    private options!: ConstructorOptions

    get model() {
        return this._model
    }

    get executablePath() {
        return this._executablePath
    }

    get modelPath() {
        return this._modelPath
    }

    get decoderConfig() {
        return this._decoderConfig
    }

    private set model(model: SupportedModels) {
        this._model = model
    }

    private set executablePath(executablePath: string) {
        this._executablePath = executablePath
    }

    private set modelPath(modelPath: string) {
        this._modelPath = modelPath
    }

    private set decoderConfig(decoderConfig: Record<string, unknown>) {
        this._decoderConfig = decoderConfig
    }

    constructor(opts: Partial<ConstructorOptions>) {
        this.options = getOptions(opts)
        Object.assign(this, this.options)

        if (
            ('ggml-vicuna-13b-4bit-rev1' !== opts.model && 'ggml-vicuna-7b-4bit-rev1' !== opts.model) ||
            opts.modelOverride
        ) {
            throw new Error(`Model ${opts.model} is not supported. Current models supported are: 
                ggml-vicuna-13b-4bit-rev1
                ggml-vicuna-7b-4bit-rev1

                or if you think your model can run on this package set
                modelOverride=true
                
                `)
        }
    }

    async init(forceDownload = false): Promise<void> {
        const downloadPromises: Promise<void>[] = []

        if (forceDownload || !existsSync(this.executablePath)) {
            downloadPromises.push(this.downloadExecutable())
        }

        if (forceDownload || !existsSync(this.modelPath)) {
            downloadPromises.push(this.downloadModel())
        }

        await Promise.all(downloadPromises)
    }

    public async open(): Promise<void> {
        if (this.bot !== null) {
            this.close()
        }

        const spawnArgs = [
            this.executablePath,
            '-i',
            '--interactive-first',
            '-r',
            '### Human:',
            '-t',
            '8',
            '--temp',
            '0',
            '-c',
            '2048',
            '-n',
            '-1',
            '--ignore-eos',
            '--repeat_penalty',
            '1.2',
            '--instruct',
            '--model',
            this.modelPath
        ]

        for (const [key, value] of Object.entries(this.decoderConfig)) {
            spawnArgs.push(`--${key}`, (value as unknown as string).toString())
        }

        this.bot = spawn(spawnArgs[0], spawnArgs.slice(1), { stdio: ['pipe', 'pipe', 'ignore'] })
        // wait for the bot to be ready
        await new Promise((resolve) => {
            this.bot?.stdout?.on('data', (data) => {
                if (data.toString().includes('>')) {
                    resolve(true)
                }
            })
        })
    }

    public close(): void {
        if (this.bot !== null) {
            this.bot.kill()
            this.bot = null
        }
    }

    private async downloadExecutable(): Promise<void> {
        let upstream: string
        const platform = os.platform()

        if (platform === 'win32') {
            upstream = 'https://github.com/shubham8550/vicuna-ts/blob/master/assets/main.exe?raw=true'
        } else {
            throw new Error(
                `Your platform is not supported: ${platform}. Current binaries supported are for Windows. ill add others later or u can set in options`
            )
        }

        await this.downloadFile(upstream, this.executablePath)

        await chmod(this.executablePath, 0o755)

        console.log(`File downloaded successfully to ${this.executablePath}`)
    }

    private async downloadModel(): Promise<void> {
        let modelUrl = ''
        if (this.model == 'ggml-vicuna-7b-4bit-rev1') {
            modelUrl = `https://huggingface.co/eachadea/ggml-vicuna-7b-4bit/resolve/main/ggml-vicuna-7b-4bit-rev1.bin`
        } else if (this.model == 'ggml-vicuna-13b-4bit-rev1') {
            modelUrl = `https://huggingface.co/eachadea/ggml-vicuna-13b-4bit/resolve/main/ggml-vicuna-13b-4bit-rev1.bin`
        } else {
            throw new Error(`Your Model Download URL not EXIST`)
        }
        await this.downloadFile(modelUrl, this.modelPath)

        console.log(`File downloaded successfully to ${this.modelPath}`)
    }

    private async downloadFile(url: string, destination: string): Promise<void> {
        const { data, headers } = await axios.get(url, { responseType: 'stream' })
        const totalSize = parseInt(headers['content-length'], 10)
        const progressBar = new ProgressBar('[:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: totalSize
        })
        const dir = vicunaDir()
        if (!existsSync(dir)) await mkdir(dir)

        const writer = createWriteStream(destination)

        data.on('data', (chunk: Record<'length', number>) => {
            progressBar.tick(chunk.length)
        })

        data.pipe(writer)

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve)
            writer.on('error', reject)
        })
    }

    public prompt(prompt: string): Promise<string> {
        if (this.bot === null) {
            throw new Error('Bot is not initialized.')
        }

        if (this.bot.stdin) this.bot.stdin.write(prompt + '\n')

        return new Promise((resolve, reject) => {
            let response = ''
            let timeoutId: NodeJS.Timeout

            const onStdoutData = (data: Buffer) => {
                const text = data.toString()
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }

                if (text.includes('>')) {
                    // console.log('Response starts with >, end of message - Resolving...'); // Debug log: Indicate that the response ends with "\\f"
                    if (this.options.callback) this.options.callback('<end>')
                    terminateAndResolve(response) // Remove the trailing "\f" delimiter
                } else {
                    timeoutId = setTimeout(() => {
                        // console.log('Timeout reached - Resolving...'); // Debug log: Indicate that the timeout has been reached
                        terminateAndResolve(response)
                    }, 4000) // Set a timeout of 4000ms to wait for more data
                }
                // console.log('Received text:', text); // Debug log: Show the received text
                this.options.callback(text)
                response += text
                // console.log('Updated response:', response); // Debug log: Show the updated response
            }

            const onStdoutError = (err: Error) => {
                if (!this.bot?.stdout) return reject(err)
                this.bot.stdout.removeListener('data', onStdoutData)
                this.bot.stdout.removeListener('error', onStdoutError)
                reject(err)
            }

            const terminateAndResolve = (finalResponse: string) => {
                if (!this.bot?.stdout) return resolve(finalResponse)
                this.bot.stdout.removeListener('data', onStdoutData)
                this.bot.stdout.removeListener('error', onStdoutError)
                // check for > at the end and remove it
                if (finalResponse.endsWith('>')) {
                    finalResponse = finalResponse.slice(0, -1)
                }
                resolve(finalResponse)
            }
            if (!this.bot?.stdout) return
            this.bot.stdout.on('data', onStdoutData)
            this.bot.stdout.on('error', onStdoutError)
        })
    }
}
