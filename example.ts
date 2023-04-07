import { VICUNA } from "./src/vicuna-ts";

const main = async () => {
    // Instantiate vicuna with default or custom settings
    const vicuna = new VICUNA({
        model:"ggml-vicuna-13b-4bit-rev1",
        callback:(token)=>{console.log(token)}
    }); // Default is 'vicuna-lora-quantized' model
  
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