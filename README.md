# RWKV-Inspired Chat Workspace

An animated React + Vite playground that mimics the look and feel of a ChatGPT-style interface with persistent histories, conversational chips, and an OCR bridge ready for image uploads. The UI is production-lean, with story templates, composer shortcuts, and a placeholder hook for the text-generation endpoint you will connect later.

## Features
- **Ambient cockpit design** with a stacked history sidebar, status chips, and hero badge that mirrors the provided RWKV concept art.
- **Conversation history templates** that can be filtered, previewed, and reloaded for new prompts.
- **Draft composer** that supports pressing Enter (without Shift) to queue a prompt, drop-zone uploads, and accessibility-safe controls.
- **OCR.space integration**: dropping or browsing an image hits the OCR API so you can continue with parsed text on the same screen.
- **Text-generation stub**: the assistant response is faked for now but shows exactly where to plug in your future endpoint.

## Getting started
1. Install dependencies: `npm install`.
2. Start the dev server: `npm run dev` (Vite will open on `localhost:5173`).
3. Build for production: `npm run build`.

## OCR.space configuration
The composer lets you paste your OCR.space API key directly inside the UI. Leave it empty to use the demo key (`helloworld`), or type a real key to use your account’s quota. The upload flow in the UI uses the `handleImageUpload` function, which takes the uploaded file, attaches the key, and POSTs to the parser endpoint; see [src/App.jsx#L175-L201](src/App.jsx#L175-L201). The parsed text then appears in the read-only OCR panel where you can copy or reset it.

## Text-generation placeholder
Two locations guide your future integration:

1. Swap the placeholder URL stored in `TEXT_API_PLACEHOLDER` so it matches your API: [src/App.jsx#L4](src/App.jsx#L4).
2. Update `handleSend` to call your endpoint, pass `userInput`, and replace the stubbed assistant reply; the function currently mocks the response and prompts you to plug in real model logic—see [src/App.jsx#L140-L202](src/App.jsx#L140-L202).

Once you replace that logic, the composer will use your chosen text-generation service instead of the demo message.
