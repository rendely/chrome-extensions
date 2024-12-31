function fetchCode(prompt) {
    fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'qwen2.5-coder:1.5b',
        prompt: prompt
    })
})
.then(response => {
    if (!response.body) {
        throw new Error('ReadableStream not supported by the browser or empty response body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    reader.read().then(function processChunk({ done, value }) {
        if (done) {
            console.log('Stream complete');
            return;
        }

        latest = decoder.decode(value, { stream: true });
        buffer += latest;
        message = JSON.parse(latest);

        // You can process or log the buffer incrementally here
        // console.log('Chunk received:', buffer);
        console.log(message.response);
        chrome.runtime.sendMessage({type: 'write', text: message.response});
        

        // Continue reading the stream
        return reader.read().then(processChunk);
    });
})
.catch(error => console.error('Error:', error));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    if (request.type === 'fetchCode') {
        fetchCode(request.prompt)            
    }
});
