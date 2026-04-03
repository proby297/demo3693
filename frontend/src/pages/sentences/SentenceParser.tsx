import React, { useState, useEffect, useRef } from 'react';
import { saveSelectedWords, submitSegmentationTask, WordSegmentationRes } from '../../services/sentenceService';
import styles from './SentenceParser.module.css';
import { io, Socket } from 'socket.io-client';

const SentenceParser = () => {
    const [text, setText] = useState<string>('');

    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
    const [saveLoading, setSaveLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [segmentationResult, setSegmentationResult] = useState<WordSegmentationRes | null>(null);
    const [userLanguage, setUserLanguage] = useState<string>('auto')
    //
    const socketRef = useRef<Socket | null>(null);
    useEffect(() => {
        // 组件加载时，建立 WebSocket 连接
        // 【关键】直接连接到后端暴露的端口 3000，Vite 代理对 WebSocket 无效
        // 确保这里的 URL 是您后端 Socket.IO 服务器的地址
        const newSocket = io("http://localhost:3000");
        socketRef.current = newSocket;
        newSocket.on('connect', () => {
            console.log('WebSocket 连接已建立! socketid:', newSocket.id);
        })
        // 【关键】监听我们自定义的 'task-completed' 事件
        newSocket.on('task-completed', (result: WordSegmentationRes) => {
            console.log('收到任务完成结果:', result);
            setSegmentationResult(result);
            setIsProcessing(false);
        })
        newSocket.on('disconnect', (reason) => {
            console.log('WebSocket 连接已断开:', reason);
        })

        newSocket.on('connect_error', (err) => {
            console.error('WebSocket 连接错误:', err);
        });

        // 【关键】组件卸载时，执行清理操作
        return () => {
            console.log("组件卸载，断开 WebSocket 连接。");
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, []);
    // 解析文本 - 实际上只是切换到解析模式，不调用API
    // 调用需要的解析函数
    const handleParse = async () => {
        if (isProcessing || !text.trim()) return;
        setIsProcessing(true);
        setSegmentationResult(null);
        try {
            // 步骤 A: 调用修正后的服务函数，提交任务到 HTTP 端点
            console.log(`正在提交任务: "${text}"`);
            // 假设 submitSegmentationTask 返回一个包含 taskId 的对象
            const response = await submitSegmentationTask({ sentence: text, user_language: userLanguage });
            // 确保 response 和 taskId 的结构与您的 service 函数一致
            const taskId = response.taskId || (response as any).task_id; // 兼容不同命名

            if (!taskId) {
                throw new Error("未能从提交任务响应中获取 TaskID");
            }
            console.log(`任务提交成功，获得 TaskID: ${taskId}`);

            // 步骤 B: 获得 taskId 后，通过 WebSocket 发送订阅请求
            if (socketRef.current && socketRef.current.connected) {
                console.log(`正在通过 WebSocket 订阅任务: ${taskId}`);
                socketRef.current.emit('subscribe-to-task', taskId);
            } else {
                console.error("WebSocket 未连接，无法订阅任务。");

                setIsProcessing(false);
            }

        } catch (err: any) {
            console.error("提交任务失败:", err);

            setIsProcessing(false);
        }
    }

    // 处理单词点击
    const handleWordClick = (word: string) => {
        const newSelected = new Set(selectedWords);

        if (newSelected.has(word)) {
            newSelected.delete(word);
        } else {
            newSelected.add(word);
        }

        setSelectedWords(newSelected);
    };

    // 返回编辑模式
    const handleBackToEdit = () => {
        setIsProcessing(false);
    };

    // 保存选中的单词
    const handleSaveWords = async () => {
        if (!text || selectedWords.size === 0) {
            return;
        }

        setSaveLoading(true);
        setMessage(null);

        try {
            const result = await saveSelectedWords({
                originalText: text,
                selectedWords: Array.from(selectedWords)
            });

            setMessage({
                text: result.message || '单词保存成功',
                type: 'success'
            });
        } catch (error: any) {
            console.error('保存单词失败:', error);
            setMessage({
                text: error.response?.data?.message || '保存失败，请重试',
                type: 'error'
            });
        } finally {
            setSaveLoading(false);
            setSelectedWords(new Set());
        }
    };
    console.log(segmentationResult)

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>句子解析</h1>
            <p className={styles.description}>
                输入您想要学习的句子或段落，点击解析后可以选择想要添加到生词本的单词。
            </p>
            <div className={styles.languageSelectContainer}>
                <label htmlFor="languageSelect" className={styles.languageLabel}>
                    选择语言：
                </label>
                <select
                    id="languageSelect"
                    className={styles.languageSelect}
                    value={userLanguage}
                    onChange={(e) => setUserLanguage(e.target.value)}
                >
                    <option value="auto">自动识别</option>
                    <option value="en">英语</option>
                    <option value="ja">日语</option>
                    <option value="fr">法语</option>
                    <option value="de">德语</option>
                    <option value="es">西班牙语</option>
                    <option value="pt">葡萄牙语</option>
                    <option value="it">意大利语</option>
                    <option value="ru">俄语</option>

                    {/* 可按需添加更多语言 */}
                </select>
            </div>

            {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            {!isProcessing ? (
                // 编辑模式
                <form className={styles.form} onSubmit={handleParse}>
                    <textarea
                        className={styles.textarea}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="请输入需要学习的文本..."
                        rows={8}
                    />

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={!text.trim()}
                    >
                        解析
                    </button>
                </form>
            ) : (
                // 解析模式
                <div className={styles.result}>
                    <h2 className={styles.resultTitle}>请选择单词</h2>
                    <div className={styles.parsedText}>
                        {text.split(/\s+/).map((word, index) => {
                            // 清理单词，去除标点符号
                            const cleanWord = word.replace(/[^\w']|_/g, '').toLowerCase();

                            // 忽略空字符串
                            if (!cleanWord) return <span key={index}>{word} </span>;

                            return (
                                <span
                                    key={index}
                                    className={`${styles.word} ${selectedWords.has(cleanWord) ? styles.selected : ''}`}
                                    onClick={() => handleWordClick(cleanWord)}
                                >
                                    {word}{' '}
                                </span>
                            );
                        })}
                    </div>

                    <div className={styles.selectedWordsContainer}>
                        <h3 className={styles.selectedWordsTitle}>已选单词 ({selectedWords.size})</h3>
                        <div className={styles.selectedWordsList}>
                            {Array.from(selectedWords).map(word => (
                                <span key={word} className={styles.selectedWordChip}>
                                    {word}
                                    <button
                                        className={styles.removeWord}
                                        onClick={() => handleWordClick(word)}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        <button
                            className={styles.backButton}
                            onClick={handleBackToEdit}
                        >
                            返回编辑
                        </button>

                        <button
                            className={styles.saveButton}
                            onClick={handleSaveWords}
                            disabled={saveLoading || selectedWords.size === 0}
                        >
                            {saveLoading ? '保存中...' : '保存选中单词'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SentenceParser;