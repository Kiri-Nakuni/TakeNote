// renderer.js

// レンダラープロセスのエラーを捕捉してメインプロセスに送信
window.addEventListener('error', (event) => {
  window.appUtils.logError({
    type: 'renderer:error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error ? event.error.stack : 'No stack available',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  window.appUtils.logError({
    type: 'renderer:unhandledRejection',
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
  });
});

window.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const sidebarContent = document.getElementById('sidebar-content');

  // モーダル関連のDOM要素
  const inputModal = document.getElementById('inputModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalInput = document.getElementById('modalInput');
  const modalConfirmButton = document.getElementById('modalConfirmButton');
  const modalCancelButton = document.getElementById('modalCancelButton');
  const modeSwitchCheckbox = document.getElementById('mode-switch-checkbox');

  // モード切り替えスイッチのイベントリスナー
  modeSwitchCheckbox.addEventListener('change', (event) => {
    document.body.classList.toggle('view-mode', event.target.checked);
  });

  // モーダルを表示する関数
  const showInputModal = (title, placeholder = '') => {
    modalTitle.textContent = title;
    modalInput.value = '';
    modalInput.placeholder = placeholder;
    inputModal.showModal();
    // setTimeoutを使用して、現在のイベントループが完了し、ダイアログが
    // フォーカスを受け入れられる状態になってからフォーカスを当てます。
    setTimeout(() => {
      modalInput.focus();
    }, 0);

    return new Promise(resolve => {
      let result = null; // デフォルトはキャンセル(null)

      const cleanup = () => {
        modalConfirmButton.removeEventListener('click', confirmHandler);
        modalCancelButton.removeEventListener('click', cancelHandler);
        inputModal.removeEventListener('close', closeHandler);
      };

      const confirmHandler = () => {
        result = modalInput.value;
        inputModal.close(); // これで 'close' イベントが発火する
      };

      const cancelHandler = () => {
        result = null;
        inputModal.close(); // これで 'close' イベントが発火する
      };

      const closeHandler = () => {
        cleanup();
        resolve(result);
      };

      modalConfirmButton.addEventListener('click', confirmHandler);
      modalCancelButton.addEventListener('click', cancelHandler);
      inputModal.addEventListener('close', closeHandler);
    });
  };

  // モーダル内のインプットでEnterキーを押したときの処理
  modalInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && inputModal.open) {
      event.preventDefault(); // デフォルトの動作をキャンセル
      modalConfirmButton.click();
    }
  });

  let currentFile = null; // 現在開いているファイルのパス
  let activeFileElement = null; // 現在アクティブなファイルのDOM要素

  // Mermaidの初期化
  mermaid.initialize({ startOnLoad: false });

  const render = async (markdown) => {
    if (preview) {
      const htmlResult = window.markdown.render(markdown);
      preview.innerHTML = htmlResult;

      // KaTeXの\htmlDataで付与された属性に基づいて動的にスケーリングを適用
      const elementsWithScale = preview.querySelectorAll('span[data-xscale], span[data-yscale]');
      elementsWithScale.forEach(el => {
        const xScale = el.dataset.xscale || 1;
        const yScale = el.dataset.yscale || 1;
        // transformを適用するには、displayがinline-blockまたはblockである必要がある
        el.style.display = 'inline-block';
        el.style.transformOrigin = 'center';
        el.style.transform = `scale(${xScale}, ${yScale})`;
      });

      // Mermaid.jsのグラフをレンダリング
      const mermaidElements = preview.querySelectorAll('code.language-mermaid');
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i];
        const graphDefinition = element.textContent || '';
        const graphId = `mermaid-graph-${Date.now()}-${i}`;

        try {
          const { svg } = await mermaid.render(graphId, graphDefinition);
          const graphContainer = document.createElement('div');
          graphContainer.innerHTML = svg;
          element.parentElement.replaceWith(graphContainer);
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          const errorContainer = document.createElement('pre');
          errorContainer.innerHTML = `グラフの描画に失敗しました: ${error.message}`;
          element.parentElement.replaceWith(errorContainer);
        }
      }
    }
  };

  // サイドバーのファイル/フォルダをハイライトする関数
  const highlightSidebarItem = (element) => {
    if (activeFileElement) {
      activeFileElement.classList.remove('active-file');
    }
    if (element) {
      element.classList.add('active-file');
      activeFileElement = element;

      // 親フォルダが折りたたまれていたら展開する
      let parent = element.parentElement;
      while (parent && parent.id !== 'file-tree-container') {
        if (parent.tagName === 'UL' && parent.classList.contains('nested')) {
          if (!parent.classList.contains('active')) {
            parent.classList.add('active');
            // 対応するトグラーも更新（もしあれば）
            const toggler = parent.previousElementSibling;
            if (toggler && toggler.classList.contains('sidebar-item')) {
               // 展開状態を示すクラスなどをここに追加可能
            }
          }
        }
        parent = parent.parentElement;
      }
    } else {
      activeFileElement = null;
    }
  };

  const loadFile = async (fileName) => {
    try {
      const content = await window.fs.readFile(fileName);
      if (content !== null) {
        editor.value = content;
        currentFile = fileName;
        await render(content);
        const fileElement = document.querySelector(`.sidebar-item[data-path="${fileName}"]`);
        highlightSidebarItem(fileElement);
        window.appUtils.updateTitle(fileName);
        editor.focus(); // フォーカスを当てる
      } else {
        editor.value = '';
        currentFile = null;
        preview.innerHTML = 'ファイルの内容を読み込めませんでした。';
      }
    } catch (error) {
      console.error('Error loading file:', error);
      editor.value = '';
      currentFile = null;
      preview.innerHTML = 'ファイルの読み込み中にエラーが発生しました。';
    }
  };

  const saveFile = async () => {
    const content = editor.value;
    let fileNameToSave = currentFile;

    if (!fileNameToSave) {
      // 新規ファイルの場合、ファイル名をユーザーに入力させる
      fileNameToSave = await showInputModal('新しいノートのファイル名を入力してください', 'my_note.tan');
      if (!fileNameToSave) {
        // モーダルがキャンセルされた場合は何もしない
        return;
      }
      // 拡張子がない場合、.tan を追加
      if (!fileNameToSave.endsWith('.tan')) {
        fileNameToSave += '.tan';
      }
    }

    try {
      const result = await window.fs.writeFile(fileNameToSave, content);
      if (result.success) {
        alert(`'${fileNameToSave}' を保存しました。`);
        currentFile = fileNameToSave; // 新規保存の場合、currentFileを更新
        window.appUtils.updateTitle(currentFile);
        await loadFilesIntoSidebar(); // サイドバーを再描画
        // 保存後に新しいファイルをハイライト
        const fileElement = document.querySelector(`.sidebar-item[data-path="${fileNameToSave}"]`);
        highlightSidebarItem(fileElement);
      } else {
        alert(`'${fileNameToSave}' の保存に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert('ファイルの保存中にエラーが発生しました。');
    }
  };

  const createNewNote = () => {
    editor.value = `# 新しいノート\n\nここに内容を記述してください。`;
    preview.innerHTML = '';
    currentFile = null; // 新規ノートなので、現在のファイルはなし
    window.appUtils.updateTitle(null);
    // ViewモードだったらEditモードに戻す
    if (document.body.classList.contains('view-mode')) {
      modeSwitchCheckbox.checked = false;
      document.body.classList.remove('view-mode');
    }
    highlightSidebarItem(null); // ハイライトを解除
    editor.focus(); // フォーカスを当てる
  };

  const createNewFolder = async () => {
    const folderName = await showInputModal('新しいフォルダ名を入力してください', 'my_folder');
    if (!folderName) {
      // モーダルがキャンセルされた場合は何もしない
      return;
    }
    try {
      const result = await window.fs.createDirectory(folderName);
      if (result.success) {
        alert(`フォルダ '${folderName}' を作成しました。`);
        await loadFilesIntoSidebar(); // サイドバーを更新
      } else {
        alert(`フォルダ '${folderName}' の作成に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('フォルダの作成中にエラーが発生しました。');
    }
  };

  // ファイルツリーを再帰的に作成する関数
  const createTree = async (parentElement, subDir = '') => {
    const files = await window.fs.getFiles(subDir);
    if (!files || files.length === 0) {
      return;
    }

    // フォルダを先に、ファイルを後にソート
    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const ul = document.createElement('ul');
    if (subDir !== '') {
      ul.classList.add('nested');
    }

    for (const file of files) {
      const li = document.createElement('li');
      const itemSpan = document.createElement('span');
      itemSpan.classList.add('sidebar-item');
      itemSpan.dataset.path = file.path;

      if (file.isDirectory) {
        itemSpan.textContent = '📁 ' + file.name;
        itemSpan.addEventListener('click', function(e) {
          e.stopPropagation(); // liへのイベント伝播を停止
          this.parentElement.querySelector('.nested')?.classList.toggle('active');
        });
        li.appendChild(itemSpan);
        await createTree(li, file.path); // 再帰呼び出し
      } else {
        itemSpan.textContent = '📄 ' + file.name.replace(/\.html$/, '');
        itemSpan.addEventListener('click', () => loadFile(file.path));
        li.appendChild(itemSpan);
      }
      ul.appendChild(li);
    }
    parentElement.appendChild(ul);
  };

  const loadFilesIntoSidebar = async () => {
    if (sidebarContent) {
      sidebarContent.innerHTML = ''; // サイドバーの動的コンテンツをクリア

      // 新規ノート作成ボタン
      const newNoteButton = document.createElement('button');
      newNoteButton.textContent = '新しいノート';
      newNoteButton.className = 'edit-mode-button';
      newNoteButton.onclick = createNewNote;
      sidebarContent.appendChild(newNoteButton);

      // 新しいフォルダ作成ボタン
      const newFolderButton = document.createElement('button');
      newFolderButton.textContent = '新しいフォルダ';
      newFolderButton.className = 'edit-mode-button';
      newFolderButton.onclick = createNewFolder;
      sidebarContent.appendChild(newFolderButton);

      // 保存ボタン
      const saveButton = document.createElement('button');
      saveButton.textContent = '保存';
      saveButton.className = 'edit-mode-button';
      saveButton.onclick = saveFile;
      sidebarContent.appendChild(saveButton);

      // エラーログ出力ボタン
      const exportLogsButton = document.createElement('button');
      exportLogsButton.textContent = 'エラーログ出力';
      exportLogsButton.onclick = async () => {
        try {
          const result = await window.appUtils.exportLogs();
          if (!result.success) {
            alert(`ログのエクスポートに失敗しました: ${result.error}`);
          }
          // 成功時はメインプロセスがダイアログで通知するため、ここでは何もしません
        } catch (error) {
          console.error('Failed to invoke exportLogs:', error);
          alert('ログのエクスポート処理を呼び出せませんでした。');
        }
      };
      sidebarContent.appendChild(exportLogsButton);

      const treeContainer = document.createElement('div');
      treeContainer.id = 'file-tree-container';
      sidebarContent.appendChild(treeContainer);

      await createTree(treeContainer);

      // 現在開いているファイルがあればハイライトを復元
      if (currentFile) {
        highlightSidebarItem(document.querySelector(`.sidebar-item[data-path="${currentFile}"]`));
      }
    }
  };

  // 初期表示
  await loadFilesIntoSidebar();
  // アプリケーション起動時にデフォルトのノートを読み込むか、新規ノートを作成
  // ここでは、とりあえず新規ノート作成状態にする
  createNewNote();

  if (editor) {
    // リアルタイム更新
    let timeout;
    editor.addEventListener('input', (event) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        render(event.target.value);
      }, 250);
    });
  }
});