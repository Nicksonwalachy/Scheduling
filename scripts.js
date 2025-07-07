document.addEventListener('DOMContentLoaded', () => {
    const chatFileInput = document.getElementById('chatFile');
    const patternInput = document.getElementById('patternInput');
    const processBtn = document.getElementById('processBtn');
    const dataTable = document.getElementById('dataTable');
    const downloadBtn = document.getElementById('downloadBtn');

    patternInput.value = "Sistema configurado para extrair agendamentos com base em palavras-chave como 'Cliente:' ou '°NOME:'.";
    
    processBtn.addEventListener('click', handleFile);

    function handleFile() {
        const file = chatFileInput.files[0];
        if (!file) {
            alert("Por favor, selecione um arquivo .txt");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            processContent(content);
        };
        reader.readAsText(file);
    }

    function processContent(content) {
        // Regex para quebrar o chat em mensagens individuais, mesmo que tenham múltiplas linhas.
        // A quebra acontece na data/hora de uma nova mensagem.
        const messageRegex = /\[\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}\]/g;
        const chunks = content.split(messageRegex).slice(1); // Pega os pedaços após cada data
        const timestamps = content.match(messageRegex); // Pega todas as datas

        if (!chunks || !timestamps) {
            alert("Formato do arquivo de chat não reconhecido.");
            return;
        }

        const results = [];

        for (let i = 0; i < chunks.length; i++) {
            const messageBlock = chunks[i];
            
            // Ignora mensagens de sistema que não têm ":" após o nome (Ex: "Você adicionou...")
            if (messageBlock.indexOf(':') === -1) {
                continue;
            }

            // Pega o Remetente e o conteúdo da mensagem
            const sender = messageBlock.substring(0, messageBlock.indexOf(':')).trim();
            const messageContent = messageBlock.substring(messageBlock.indexOf(':') + 1);

            // Verifica se a mensagem parece ser um agendamento
            if (!/cliente:|°nome:/i.test(messageContent)) {
                continue;
            }

            const record = {
                remetente: sender,
                cliente: '',
                corretor: '',
                dia: '',
                horario: '',
                tipo: '',
                observacao: ''
            };

            const lines = messageContent.split('\n');
            let tempObservacoes = [];

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                const match = trimmedLine.match(/^([^:]+):\s*(.*)/);

                if (match) {
                    let key = match[1].toLowerCase().trim();
                    const value = match[2].trim();

                    // Remove caracteres especiais para unificar chaves como °NOME°
                    key = key.replace(/°/g, '');

                    switch (key) {
                        case 'cliente':
                        case 'nome':
                            record.cliente = value;
                            break;
                        case 'corretora':
                        case 'corretor':
                            record.corretor = value;
                            break;
                        case 'dia':
                            record.dia = value;
                            break;
                        case 'horário':
                        case 'horario':
                            record.horario = value;
                            break;
                        case 'tipo':
                            record.tipo = value;
                            break;
                        default:
                            // Se a chave não for conhecida, trata a linha toda como observação
                            tempObservacoes.push(trimmedLine);
                            break;
                    }
                } else {
                    // Linhas sem ":" são tratadas como observação
                    tempObservacoes.push(trimmedLine);
                }
            }
            record.observacao = tempObservacoes.join(' | '); // Junta as observações com um separador
            results.push(record);
        }
        
        if (results.length === 0) {
            alert("Nenhum agendamento encontrado no arquivo.");
            dataTable.innerHTML = "";
            downloadBtn.style.display = 'none';
            return;
        }

        displayResults(results);
        setupDownload(results);
    }
    
    function displayResults(data) {
        dataTable.innerHTML = '';
        const headers = ['Remetente', 'Cliente', 'Corretor/a', 'Dia', 'Horário', 'Tipo', 'Observações'];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        dataTable.appendChild(headerRow);

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.remetente || ''}</td>
                <td>${item.cliente || ''}</td>
                <td>${item.corretor || ''}</td>
                <td>${item.dia || ''}</td>
                <td>${item.horario || ''}</td>
                <td>${item.tipo || ''}</td>
                <td>${item.observacao || ''}</td>
            `;
            dataTable.appendChild(row);
        });
    }

    function setupDownload(data) {
        const headers = ['Remetente', 'Cliente', 'Corretor_a', 'Dia', 'Horario', 'Tipo', 'Observacoes'];
        let csvContent = headers.join(';') + '\n';
        
        data.forEach(item => {
            const row = [
                item.remetente || '',
                item.cliente || '',
                item.corretor || '',
                item.dia || '',
                item.horario || '',
                item.tipo || '',
                (item.observacao || '').replace(/"/g, '""') // Lida com aspas na observação
            ];
            csvContent += '"' + row.join('";"') + '"\n'; // Coloca todos os campos entre aspas
        });

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        downloadBtn.href = url;
        downloadBtn.download = 'extracao_whatsapp.csv';
        downloadBtn.style.display = 'block';
    }
});