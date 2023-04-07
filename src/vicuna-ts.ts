import {exec, spawn} from 'child_process';
import {promisify} from 'util';
import * as fs from 'fs';
import * as os from 'os';
import axios from 'axios';
import * as ProgressBar from 'progress';

export interface ConstructorOptions{
    model: "ggml-vicuna-13b-4bit-rev1" | "ggml-vicuna-7b-4bit-rev1",
    executablePath?: string,
    modelPath?: string,
    callback?:(token)=>void,
    forceDownload?: boolean ,
    decoderConfig?: Record<string, any>,
    modelOverride?:boolean
}

export class VICUNA {
    private bot: ReturnType<typeof spawn> | null = null;
    private model: string;
    private decoderConfig: Record<string, any>;
    private executablePath: string;
    private modelPath: string;

    
    constructor(public options:ConstructorOptions) {

        let defaults:ConstructorOptions={
            model:"ggml-vicuna-7b-4bit-rev1",
            executablePath:`${os.homedir()}/.vicuna_ts/main.exe`,
            modelPath:`${os.homedir()}/.vicuna_ts/${options.model}.bin`,
            forceDownload: false ,
            decoderConfig: {},
            modelOverride:false,
            callback:(token)=>{
                console.log(token)
            }
        }

        Object.assign(defaults,options)
        options=defaults
            
        Object.assign(this,options)
    /* 
    allowed models: 
    M1 Mac/OSX: cd chat;./gpt4all-lora-quantized-OSX-m1
    Linux: cd chat;./gpt4all-lora-quantized-linux-x86
    Windows (PowerShell): cd chat;./gpt4all-lora-quantized-win64.exe
    Intel Mac/OSX: cd chat;./gpt4all-lora-quantized-OSX-intel
    */
        if (
            ("ggml-vicuna-13b-4bit-rev1" !== options.model && 
            "ggml-vicuna-7b-4bit-rev1" !== options.model) || options.modelOverride
        ) {
            throw new Error(`Model ${options.model} is not supported. Current models supported are: 
                ggml-vicuna-13b-4bit-rev1
                ggml-vicuna-7b-4bit-rev1

                or if you think your model can run on this package set
                modelOverride=true
                
                `
            );
        }
        

   
    }

    async init(forceDownload: boolean = false): Promise<void> {
        const downloadPromises: Promise<void>[] = [];

        if (forceDownload || !fs.existsSync(this.executablePath)) {
            downloadPromises.push(this.downloadExecutable());
        }

        if (forceDownload || !fs.existsSync(this.modelPath)) {
            downloadPromises.push(this.downloadModel());
        }

        await Promise.all(downloadPromises); 
    }

    public async open(): Promise<void> {
        if (this.bot !== null) {
            this.close();
        }

        let spawnArgs = [this.executablePath,'-i','--interactive-first','-r',"### Human:",'-t','8','--temp','0','-c','2048','-n','-1','--ignore-eos','--repeat_penalty','1.2','--instruct', '--model', this.modelPath];

        for (let [key, value] of Object.entries(this.decoderConfig)) {
            spawnArgs.push(`--${key}`, value.toString());
        }

        this.bot = spawn(spawnArgs[0], spawnArgs.slice(1), {stdio: ['pipe', 'pipe', 'ignore']});
        // wait for the bot to be ready
        await new Promise((resolve) => {
            this.bot?.stdout?.on('data', (data) => {
                if (data.toString().includes('>')) {
                    resolve(true);
                }
            });
        });
    }

    public close(): void {
        if (this.bot !== null) {
            this.bot.kill();
            this.bot = null;
        }
    }

    private async downloadExecutable(): Promise<void> {
        let upstream: string;
        const platform = os.platform();

        // if (platform === 'darwin') {
        //     // check for M1 Mac
        //     const {stdout} = await promisify(exec)('uname -m');
        //     if (stdout.trim() === 'arm64') {
        //         upstream = 'https://github.com/nomic-ai/gpt4all/blob/main/chat/gpt4all-lora-quantized-OSX-m1?raw=true';
        //     } else {
        //         upstream = 'https://github.com/nomic-ai/gpt4all/blob/main/chat/gpt4all-lora-quantized-OSX-intel?raw=true';
        //     }
        // } 
        // else if (platform === 'linux') {
        //     upstream = 'https://github.com/nomic-ai/gpt4all/blob/main/chat/gpt4all-lora-quantized-linux-x86?raw=true';
        // } 
        // else 
        if(platform === 'win32') {
            upstream = 'http://192.168.1.11/main.exe';
        } 
        else {
            throw new Error(`Your platform is not supported: ${platform}. Current binaries supported are for Windows. ill add others later or u can set in options`);
        }

        await this.downloadFile(upstream, this.executablePath);
        
        await fs.chmod(this.executablePath, 0o755, (err) => {
            if (err) {
                throw err;
            }
        });

        console.log(`File downloaded successfully to ${this.executablePath}`);
    }

    private async downloadModel(): Promise<void> {
        const modelUrl = `http://192.168.1.11/${this.model}.bin`;

        await this.downloadFile(modelUrl, this.modelPath);

        console.log(`File downloaded successfully to ${this.modelPath}`);
    }

    private async downloadFile(url: string, destination: string): Promise<void> {
        const {data, headers} = await axios.get(url, {responseType: 'stream'});
        const totalSize = parseInt(headers['content-length'], 10);
        const progressBar = new ProgressBar('[:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: totalSize,
        });
        const dir = new URL(`file://${os.homedir()}/.vicuna_ts/`)
        await fs.mkdir(dir, {recursive: true}, (err) => {
            if (err) {
                throw err;
            }
        });

        const writer = fs.createWriteStream(destination);
        
        data.on('data', (chunk: any) => {
            progressBar.tick(chunk.length);
        });

        data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    public prompt(prompt: string): Promise<string> {
        if (this.bot === null) {
            throw new Error("Bot is not initialized.");
        }
        
        this.bot.stdin.write(prompt + "\n");
    
        return new Promise((resolve, reject) => {
            let response: string = "";
            let timeoutId: NodeJS.Timeout;
    
            const onStdoutData = (data: Buffer) => {
                const text = data.toString();
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            
                if (text.includes(">")) {
                    // console.log('Response starts with >, end of message - Resolving...'); // Debug log: Indicate that the response ends with "\\f"
                    this.options.callback('<end>')
                    terminateAndResolve(response); // Remove the trailing "\f" delimiter
                } else {
                    timeoutId = setTimeout(() => {
                        // console.log('Timeout reached - Resolving...'); // Debug log: Indicate that the timeout has been reached
                        terminateAndResolve(response);
                    }, 4000); // Set a timeout of 4000ms to wait for more data
                }
                // console.log('Received text:', text); // Debug log: Show the received text
                this.options.callback(text)
                response += text;
                // console.log('Updated response:', response); // Debug log: Show the updated response

            };
    
            const onStdoutError = (err: Error) => {
                this.bot.stdout.removeListener("data", onStdoutData);
                this.bot.stdout.removeListener("error", onStdoutError);
                reject(err);
            };
    
            const terminateAndResolve = (finalResponse: string) => {
                this.bot.stdout.removeListener("data", onStdoutData);
                this.bot.stdout.removeListener("error", onStdoutError);
                // check for > at the end and remove it
                if (finalResponse.endsWith(">")) {
                    finalResponse = finalResponse.slice(0, -1);
                }
                resolve(finalResponse);
            };
    
            this.bot.stdout.on("data", onStdoutData);
            this.bot.stdout.on("error", onStdoutError);
        });
    }


}