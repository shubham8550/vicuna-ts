import { join } from 'path'
import { Vicuna } from '../src'

const main = async () => {
    // Instantiate vicuna with default or custom settings
    const vicuna = new Vicuna({
        model: 'ggml-vicuna-7b-4bit-rev1',
        modelPath: './ggml-vicuna-7b-4bit-rev1.bin',
        executablePath: join(process.cwd(), 'assets', 'main.exe'),
        callback: (token) => {
            console.log(token)
        }
    }) 

    // Initialize and download missing files
    await vicuna.init()

    // Open the connection with the model
    await vicuna.open()
    // Generate a response using a prompt
    const prompt = 'Hello I am Shubham'
    const response = await vicuna.prompt(prompt)
    console.log(`Prompt: ${prompt}`)
    console.log(`Response: ${response}`)

    const prompt2 = 'Do you still remember my name? please tell me my name'
    const response2 = await vicuna.prompt(prompt2)
    console.log(`Prompt: ${prompt2}`)
    console.log(`Response: ${response2}`)

    // Close the connection when you're done
    vicuna.close()
}

main().catch(console.error)
