import * as vscode from 'vscode';
import * as path from 'path';

class EliteGeneratorViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'elite-generator-view';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
        };
        webviewView.webview.html = this._getWebviewContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'generate':
                        const initLines = [
                            'DRP,ALL',
                            'UNBLOCK,ALL',
                            'ENB,BOF',
                            'ENB,PAT',
                            '',
                            '; Assume file name to be to same',
                            'ID,RESISTORTEST.id',
                            'SEL,RESISTORTEST.ER',
                            ''
                        ].join('\n');

                        const strings = message.data.map((item: any) => {
                            return `${item.component} => A,INIT,DCS,${item.stimulus}${item.stimulusUnit},>${item.rangeStart}${item.unit1},<${item.rangeEnd}${item.unit2},0.0T,0.1S`;
                        });

                        const endLines = [
                            '',
                            '; TODO OPERATIONS BLOCK',
                            '; DECIDE BETWEEN `AS;J3 25` OR `AS127` syntax',
                            '',
                            'DRP,ALL',
                            'VPROG,0,VPROG1,N',
                            'TIM',
                            'ESR',
                            'ESD,DSK',
                            'END'
                        ].join('\n');

                        webviewView.webview.postMessage({
                            command: 'showResult',
                            text: initLines + '\n' + strings.join('\n') + '\n' + endLines
                        });
                        
                        break;
                }
            }
        );
    }

    private _getWebviewContent(webview: vscode.Webview) {
        // Use your existing getWebviewContent function here
        return getWebviewContent();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new EliteGeneratorViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(EliteGeneratorViewProvider.viewType, provider)
    );
}

function getWebviewContent() {
    return `<!DOCTYPE html>
        <html>
            <head>
                <style>
                    body {
                        padding: 10px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    select, input {
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 4px 8px;
                        margin: 2px;
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    textarea {
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 8px;
                        width: 100%;
                        max-width: 100%;
                        box-sizing: border-box;
                    }
                    .input-container {
                        width: 75px;
                    }
                    .component-row {
                        display: flex;
                        align-items: center;
                        margin: 10px 0;
                    }
                    .remove-btn {
                        background: var(--vscode-errorForeground);
                        margin-left: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="component-container">
                    <div>
                        <button onclick="addComponent()">Add Component</button>
                        <div id="formsContainer"></div>
                        <button onclick="generate()">Generate</button>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <h3 style="color: var(--vscode-foreground);">Generated Text:</h3>
                        <textarea id="result" rows="10" style="width: 100%;"></textarea>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const components = ['Connection A', 'Connection B', 'Connection C'];
                    let componentCount = 0;

                    function addComponent() {
                        const container = document.getElementById('formsContainer');
                        const form = document.createElement('div');
                        form.className = 'component-row';
                        form.id = \`row_\${componentCount}\`;
                        form.innerHTML = \`
                            <select id="component_\${componentCount}" class="vscode-select">
                                \${components.map(c => \`<option value="\${c}">\${c}</option>\`).join('')}
                            </select>
                            <input type="number" id="stimulus_\${componentCount}" placeholder="Stimulus" value="0.1" class="input-container"/>
                            <select id="stimulusUnit_\${componentCount}" class="vscode-select">
                                <option value="A" selected>A</option>
                                <option value="mA">mA</option>
                                <option value="V">V</option>
                                <option value="mV">mV</option>
                            </select>
                            <input type="number" id="range1_\${componentCount}" min="0" max="100" value="1" class="vscode-input" />
                            <select id="unit1_\${componentCount}" class="vscode-select">
                                <option value="ohm">ohm</option>
                                <option value="kohm">kohm</option>
                                <option value="Mohm">Mohm</option>
                            </select>
                            <input type="number" id="range2_\${componentCount}" min="0.05" max="100" value="10" class="vscode-input" />
                            <select id="unit2_\${componentCount}" class="vscode-select">
                                <option value="ohm">ohm</option>
                                <option value="kohm">kohm</option>
                                <option value="Mohm">Mohm</option>
                            </select>
                            <button onclick="removeComponent(\${componentCount})" class="remove-btn">Remove</button>
                        \`;
                        container.appendChild(form);
                        componentCount++;
                    }

                    function removeComponent(id) {
                        const element = document.getElementById(\`row_\${id}\`);
                        if (element) element.remove();
                    }

                    function generate() {
                        const data = [];
                        const forms = document.getElementById('formsContainer').children;
                        
                        for (const form of forms) {
                            const id = form.id.split('_')[1];
                            data.push({
                                component: document.getElementById(\`component_\${id}\`).value,
                                stimulus: document.getElementById(\`stimulus_\${id}\`).value,
                                stimulusUnit: document.getElementById(\`stimulusUnit_\${id}\`).value,
                                rangeStart: document.getElementById(\`range1_\${id}\`).value,
                                rangeEnd: document.getElementById(\`range2_\${id}\`).value,
                                unit1: document.getElementById(\`unit1_\${id}\`).value,
                                unit2: document.getElementById(\`unit2_\${id}\`).value
                            });
                        }

                        vscode.postMessage({
                            command: 'generate',
                            data: data
                        });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'showResult':
                                document.getElementById('result').value = message.text;
                                break;
                        }
                    });

                    // Add initial component
                    addComponent();
                </script>
            </body>
        </html>`;
}

export function deactivate() { }
