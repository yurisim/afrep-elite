import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('afrep-elite.generateStrings', () => {
        const panel = vscode.window.createWebviewPanel(
            'stringGenerator',
            'String Generator',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'generateStrings':
                        const strings = message.data.map((item: any) => {
                            return `${item.component} should have between ${item.rangeStart} and ${item.rangeEnd} ohms`;
                        });
                        // Send the generated text back to webview
                        panel.webview.postMessage({ 
                            command: 'showResult', 
                            text: strings.join('\n') 
                        });
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `<!DOCTYPE html>
        <html>
            <body>
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <select id="numStrings" onchange="updateForms()">
                            <option value="1">1 String</option>
                            <option value="2">2 Strings</option>
                            <option value="3">3 Strings</option>
                        </select>
                        <div id="formsContainer"></div>
                        <button onclick="generateStrings()">Generate</button>
                    </div>
                    
                    <div>
                        <h3>Generated Text:</h3>
                        <textarea id="result" rows="10" style="width: 100%; margin-top: 10px;" readonly></textarea>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const components = ['Resistor A', 'Resistor B', 'Capacitor A'];
                    
                    function updateForms() {
                        const count = parseInt(document.getElementById('numStrings').value);
                        const container = document.getElementById('formsContainer');
                        container.innerHTML = '';
                        
                        for (let i = 0; i < count; i++) {
                            const form = document.createElement('div');
                            form.innerHTML = \`
                                <div style="margin: 10px 0;">
                                    <select id="component_\${i}">
                                        \${components.map(c => \`<option value="\${c}">\${c}</option>\`).join('')}
                                    </select>
                                    <input type="number" id="range1_\${i}" min="1" max="10" value="1" />
                                    <input type="number" id="range2_\${i}" min="1" max="10" value="10" />
                                </div>
                            \`;
                            container.appendChild(form);
                        }
                    }

                    function generateStrings() {
                        const count = parseInt(document.getElementById('numStrings').value);
                        const data = [];
                        
                        for (let i = 0; i < count; i++) {
                            data.push({
                                component: document.getElementById(\`component_\${i}\`).value,
                                rangeStart: document.getElementById(\`range1_\${i}\`).value,
                                rangeEnd: document.getElementById(\`range2_\${i}\`).value
                            });
                        }

                        vscode.postMessage({
                            command: 'generateStrings',
                            data: data
                        });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        console.log('Received message:', message);  // Debug log
                        switch (message.command) {
                            case 'showResult':
                                document.getElementById('result').value = message.text;
                                break;
                        }
                    });

                    updateForms();
                </script>
            </body>
        </html>`;
}

export function deactivate() {}
