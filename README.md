# VICUNA-ts PORT 🌐🚀📚
[PORT OF GPT4ALL](https://github.com/nomic-ai/gpt4all-ts) for VICUNA

> I added Vicuna 7B and 13B CPU ,Callback support and custom model and executable path options 


```sh
npm install vicuna-ts
```

```typescript
import { VICUNA } from "vicuna-ts";

const main = async () => {
    // Instantiate vicuna with default or custom settings Interface ConstructorOptions
    const vicuna = new VICUNA({
        model:"ggml-vicuna-13b-4bit-rev1",
        callback:(token)=>{console.log(token)}   //You can use this callback as stream processing but its optional
    });  //You can use 13B and 7B vicuna
  
    // Initialize and download missing files
    await vicuna.init();

    // Open the connection with the model
    await vicuna.open();
    // Generate a response using a prompt
    const prompt = 'Hello I am Shubham';
    const response = await vicuna.prompt(prompt);
    console.log(`Prompt: ${prompt}`);
    console.log(`Response: ${response}`);

    const prompt2 = 'Do you still remember my name? please tell me my name';
    const response2 = await vicuna.prompt(prompt2);
    console.log(`Prompt: ${prompt2}`);
    console.log(`Response: ${response2}`);

        // Close the connection when you're done
        vicuna.close();
    }
      
    main().catch(console.error);
```

-  ## Options
```typescript
interface ConstructorOptions{
    model: "ggml-vicuna-13b-4bit-rev1" | "ggml-vicuna-7b-4bit-rev1",
    executablePath?: string,
    modelPath?: string,
    callback?:(token)=>void,
    forceDownload?: boolean ,
    decoderConfig?: Record<string, any>,
    modelOverride?:boolean
}
```


<br>
> Curruntly Only Win Binary added, if you have binary for your OS u can set it in options and it will work

---

## credit's : Shubham Badgujar
## Model Credits: [vicuna Team](https://vicuna.lmsys.org/)

