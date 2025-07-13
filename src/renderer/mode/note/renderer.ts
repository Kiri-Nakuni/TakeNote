/// <reference path="../../../types/global.d.ts" />

// レンダラープロセスのエラーを捕捉してメインプロセスに送信
window.addEventListener('error', (event: ErrorEvent) => {
  window.appUtils.logError({
    type: 'renderer:error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error ? event.error.stack : 'No stack available',
  });
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  window.appUtils.logError({
    type: 'renderer:unhandledRejection',
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
  });
});

window.addEventListener('DOMContentLoaded', async () => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement;
  const preview = document.getElementById('preview') as HTMLDivElement;
  const sidebarContent = document.getElementById('sidebar-content') as HTMLDivElement;

  // モーダル関連のDOM要素
  const inputModal = document.getElementById('inputModal') as HTMLDialogElement;
  const modalTitle = document.getElementById('modalTitle') as HTMLHeadingElement;
  const modalInput = document.getElementById('modalInput') as HTMLInputElement;
  const modalConfirmButton = document.getElementById('modalConfirmButton') as HTMLButtonElement;
  const modalCancelButton = document.getElementById('modalCancelButton') as HTMLButtonElement;
  const modeSwitchCheckbox = document.getElementById('mode-switch-checkbox') as HTMLInputElement;

  // モード切り替えスイッチのイベントリスナー
  modeSwitchCheckbox.addEventListener('change', (event: Event) => {
    document.body.classList.toggle('view-mode', (event.target as HTMLInputElement).checked);
  });

  // モーダルを表示する関数
  const showInputModal = (title: string, placeholder = ''): Promise<string | null> => {
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
      let result: string | null = null; // デフォルトはキャンセル(null)

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
  modalInput.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' && inputModal.open) {
      event.preventDefault(); // デフォルトの動作をキャンセル
      modalConfirmButton.click();
    }
  });

  let currentFile: string | null = null; // 現在開いているファイルのパス
  let activeFileElement: HTMLElement | null = null; // 現在アクティブなファイルのDOM要素

  /**
   * Markdownをレンダリングし、プレビューと動的要素を更新します。
   * @param markdown - レンダリングするMarkdown文字列
   */
  const render = async (markdown: string): Promise<void> => {
    const htmlResult = window.markdown.render(markdown);
    preview.innerHTML = htmlResult;

    // KaTeXの\htmlDataで付与された属性に基づいて動的にスケーリングを適用
    const elementsWithScale: NodeListOf<HTMLElement> = preview.querySelectorAll('span[data-xscale], span[data-yscale]');
    elementsWithScale.forEach(el => {
      const xScale = el.dataset.xscale || '1';
      const yScale = el.dataset.yscale || '1';
      // transformを適用するには、displayがinline-blockまたはblockである必要がある
      el.style.display = 'inline-block';
      el.style.transformOrigin = 'center';
      el.style.transform = `scale(${xScale}, ${yScale})`;
    });
  };

  /**
   * サイドバーの指定された要素をハイライトします。
   * @param element - ハイライトするDOM要素
   */
  const highlightSidebarItem = (element: HTMLElement | null): void => {
    if (activeFileElement) {
      activeFileElement.classList.remove('active-file');
    }

    if (element) {
      element.classList.add('active-file');
      activeFileElement = element;

      // 親フォルダが折りたたまれていたら展開する
      let parent = element.parentElement as HTMLElement | null;
      while (parent && parent.id !== 'file-tree-container') {
        if (parent.tagName === 'UL' && parent.classList.contains('nested')) {
          if (!parent.classList.contains('active')) {
            parent.classList.add('active');
          }
        }
        parent = parent.parentElement as HTMLElement | null;
      }
    } else {
      activeFileElement = null;
    }
  };

  const loadFile = async (fileName: string): Promise<void> => {
    try {
      const content = await window.fs.readFile(fileName);
      if (content !== null) {
        editor.value = content;
        currentFile = fileName;
        await render(content);
        const fileElement = document.querySelector<HTMLElement>(`.sidebar-item[data-path="${fileName}"]`);
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

  const saveFile = async (): Promise<void> => {
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

    const result = await window.fs.writeFile(fileNameToSave, content);
    if (result.success) {
      alert(`'${fileNameToSave}' を保存しました。`);
      currentFile = fileNameToSave; // 新規保存の場合、currentFileを更新
      window.appUtils.updateTitle(currentFile);
      await loadFilesIntoSidebar(); // サイドバーを再描画
      const fileElement = document.querySelector<HTMLElement>(`.sidebar-item[data-path="${fileNameToSave}"]`);
      highlightSidebarItem(fileElement);
    } else {
      alert(`'${fileNameToSave}' の保存に失敗しました: ${result.error}`);
    }
  };

  const createNewNote = (): void => {
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

  const createNewFolder = async (): Promise<void> => {
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
    } catch (error: any) {
      console.error('Error creating folder:', error);
      alert('フォルダの作成中にエラーが発生しました。');
    }
  };

  /**
   * ファイルツリーを再帰的に作成し、サイドバーに表示します。
   * @param parentElement - ツリーを追加する親要素
   * @param subDir - 現在のスキャン対象のサブディレクトリ
   */
  const createTree = async (parentElement: HTMLElement, subDir = ''): Promise<void> => {
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
          this.parentElement?.querySelector('.nested')?.classList.toggle('active');
        });
        li.appendChild(itemSpan);
        await createTree(li, file.path); // 再帰呼び出し
      } else {
        itemSpan.textContent = '📄 ' + file.name.replace(/\.tan$/, '');
        itemSpan.addEventListener('click', () => loadFile(file.path));
        li.appendChild(itemSpan);
      }
      ul.appendChild(li);
    }
    parentElement.appendChild(ul);
  };

  /**
   * サイドバーのコンテンツ（ボタン、ファイルツリー）を読み込み、描画します。
   */
  const loadFilesIntoSidebar = async (): Promise<void> => {
    sidebarContent.innerHTML = ''; // サイドバーをクリア

    // ボタンの作成と追加
    const buttons = [
      { text: '新しいノート', className: 'edit-mode-button', onClick: createNewNote },
      { text: '新しいフォルダ', className: 'edit-mode-button', onClick: createNewFolder },
      { text: '保存', className: 'edit-mode-button', onClick: saveFile },
      { text: 'エラーログ出力', className: '', onClick: async () => {
        try {
          const result = await window.appUtils.exportLogs();
          if (!result.success) {
            alert(`ログのエクスポートに失敗しました: ${result.error}`);
          }
        } catch (error) {
          console.error('Failed to invoke exportLogs:', error);
          alert('ログのエクスポート処理を呼び出せませんでした。');
        }
      }},
    ];

    buttons.forEach(btnInfo => {
      const button = document.createElement('button');
      button.textContent = btnInfo.text;
      if (btnInfo.className) button.className = btnInfo.className;
      button.onclick = btnInfo.onClick as (e: MouseEvent) => void;
      sidebarContent.appendChild(button);
    });

    const treeContainer = document.createElement('div');
    treeContainer.id = 'file-tree-container';
    sidebarContent.appendChild(treeContainer);

    await createTree(treeContainer);

    if (currentFile) {
      highlightSidebarItem(document.querySelector<HTMLElement>(`.sidebar-item[data-path="${currentFile}"]`));
    }
  };

  // --- 初期化処理 ---
  await loadFilesIntoSidebar();
  createNewNote();

  let timeout: NodeJS.Timeout;
  editor.addEventListener('input', (event) => {
    clearTimeout(timeout);
    const target = event.target as HTMLTextAreaElement;
    timeout = setTimeout(() => {
      render(target.value);
    }, 250);
  });
});