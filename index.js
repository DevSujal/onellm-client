const callRW = async () => {

    const response = await fetch("https://rwkv-red-team-rwkv-latestspace.hf.space/api/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "model": "rwkv7-g1a4-2.9b-20251118-ctx8192",
            "messages": [
                { "role": "system", "content": "You are a helpful assistant." },
                { "role": "user", "content": "What is the capital of France?" }
            ],
            "temperature": 0.7,
            "max_tokens": 512
        })
    }
    )

    console.log((await response.json()).choices[0].message)
}

callRW()