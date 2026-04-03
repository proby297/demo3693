import { useState, useEffect, useRef } from 'react';
import { getVocabulary, deleteWord, WordData } from '../../services/vocabularyService';
import styles from './Vocabulary.module.css';

const Vocabulary = () => {
    const [words, setWords] = useState<WordData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const isInitialMount = useRef(true);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(20);
    const [deletingWordId, setDeletingWordId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // 加载单词数据
    // 加载单词数据 - 添加了计时功能
    const loadWords = async (pageNum = 1) => {
        // 为计时器创建一个包含页码的唯一标签
        const timerLabel = `Load Page ${pageNum}`;

        try {
            console.log(`>>> [Timer Start] Starting ${timerLabel}`); // 日志：计时开始
            console.time(timerLabel); // <<<--- 启动名为 "Load Page X" 的计时器

            setLoading(true);
            setError(null);

            // 发起异步请求
            const response = await getVocabulary(pageNum, limit);

            // (你已有的日志)
            console.log('API requested page:', pageNum);
            console.log('API response pagination:', response.pagination);

            // 更新状态
            setWords(response.words);
            setTotalPages(response.pagination.totalPages);

        } catch (error: any) {
            setError('加载生词失败：' + (error.message || '未知错误'));
            console.error('加载生词失败:', error);
        } finally {
            setLoading(false);
            // <<<--- 停止同名计时器，并在控制台打印耗时
            console.timeEnd(timerLabel);
            console.log(`<<< [Timer End] Finished ${timerLabel}`); // 日志：计时结束
        }
    };

    // 组件挂载时加载单词
    useEffect(() => {
        console.log("--- Mount Effect Running ---");
        // 检测设备类型

        const checkMobile = () => {

            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

            setIsMobile(isMobileDevice);

        };
        checkMobile();

        const savedPage = localStorage.getItem('vocabulary-page');
        let initialPageToLoad = 1;
        if (savedPage) {
            const parsedPage = parseInt(savedPage, 10);
            if (!isNaN(parsedPage) && parsedPage > 0) {
                initialPageToLoad = parsedPage;
            }
        }

        // 如果需要恢复的页码不是默认的 1，更新状态
        // 这一步是为了让后续的保存Effect能正确工作，并且让分页控件初始显示正确
        if (initialPageToLoad !== page) { // 与当前 state 对比
            console.log("Mount Effect: State needs restore. Setting page to", initialPageToLoad);
            setPage(initialPageToLoad);
        }
        // 无论是否恢复了 state，都只根据计算出的初始页码加载一次数据
        console.log("Mount: Loading initial words for page:", initialPageToLoad);
        loadWords(initialPageToLoad); // <--- 只调用一次 loadWords

    }, []); // 空依赖数组
    // 当页码变化时保存到本地存储
    useEffect(() => {
        // 使用 ref 判断是否应该执行保存操作
        if (isInitialMount.current) {
            // 首次挂载完成，将 ref 设为 false，跳过本次保存
            // 对于 StrictMode，第二次挂载完成后这个 ref 仍然是 false
            isInitialMount.current = false;
            console.log("Save Effect: Skipping initial mount save for page", page);
        } else {
            // 只有在后续 page 真正因用户操作等改变时才保存
            if (typeof page === 'number' && page > 0) { // 可选：增加类型检查
                console.log("Save Effect: Page changed to", page, ". Saving to localStorage.");
                localStorage.setItem('vocabulary-page', page.toString());
            }
        }
    }, [page]); // 仍然依赖 page

    // 专门用于展开/折叠按钮的处理函数
    const handleExpandToggle = (wordId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 防止触发卡片点击事件
        setExpandedWordId(expandedWordId === wordId ? null : wordId);
    };

    // 卡片点击函数 - 不执行任何展开/折叠操作
    const handleCardClick = (_e: React.MouseEvent) => {
        // 卡片点击不做任何操作
    };

    // 处理删除确认
    const handleDeleteConfirm = (wordId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 防止触发卡片点击事件
        setDeletingWordId(wordId);
    };

    // 取消删除
    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // 防止触发卡片点击事件
        setDeletingWordId(null);
    };

    // 处理删除单词
    const handleDeleteWord = async (wordId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 防止触发卡片点击事件

        try {
            setIsDeleting(true);
            await deleteWord(wordId);

            // 更新UI：删除该单词
            setWords(words.filter(word => word._id !== wordId));

            // 如果当前页面已无单词且不是第一页，加载前一页
            if (words.length === 1 && page > 1) {
                loadWords(page - 1);
            }

            // 清除删除状态
            setDeletingWordId(null);

            // 如果删除的是当前展开的单词，清除展开状态
            if (expandedWordId === wordId) {
                setExpandedWordId(null);
            }
        } catch (error: any) {
            setError('删除单词失败：' + (error.message || '未知错误'));
            console.error('删除单词失败:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    // 处理翻页
    const handlePageChange = (newPage: number) => {
        // 添加 !== page 判断避免重复加载当前页
        if (newPage > 0 && newPage <= totalPages && newPage !== page) {
            console.log("Handle Page Change: Setting page to", newPage);
            setPage(newPage);
            loadWords(newPage); // 确保调用 loadWords
            setExpandedWordId(null); // 清除展开状态
        }
    };

    // 渲染分页控件
    const renderPagination = () => {
        return (
            <div className={`${styles.pagination} ${isMobile ? styles.mobilePagination : ''}`}>
                <button
                    onClick={() =>

                        handlePageChange(page - 1)

                    }
                    disabled={page <= 1 || loading}
                    className={`${styles.pageButton} ${isMobile ? styles.mobilePageButton : ''}`}
                >
                    上一页
                </button>
                <span className={styles.pageInfo}>{`${page} / ${totalPages}`}</span>
                <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || loading}
                    className={`${styles.pageButton} ${isMobile ? styles.mobilePageButton : ''}`}
                >
                    下一页
                </button>
            </div>
        );
    };

    return (
        <div className={`${styles.container} ${isMobile ? styles.mobileContainer : ''}`}>
            <h1 className={styles.title}>我的生词本</h1>

            {error && <div className={styles.error}>{error}</div>}

            {loading ? (
                <div className={styles.loading}>加载中...</div>
            ) : (
                <>
                    {words.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>您的生词本还是空的</p>
                            <p>去句子解析页面添加一些单词吧！</p>
                        </div>
                    ) : (
                        <>
                            <div className={`${styles.wordGrid} ${isMobile ? styles.mobileGrid : ''}`}>
                                {words.map(word => (
                                    <div
                                        key={word._id}
                                        className={`${styles.wordCard} 
                                ${expandedWordId === word._id ? styles.expanded : ''} 
                                ${isMobile ? styles.mobileCard : ''}`}
                                        onClick={handleCardClick}
                                    >
                                        {/* 卡片预览部分 - 始终可见 */}
                                        <div className={styles.cardPreview}>
                                            <div className={styles.wordInfo}>
                                                <h2 className={styles.wordTitle}>{word.word}</h2>
                                                <p className={styles.briefPhonetic}>{word.phonetic || ''}</p>
                                                <p className={styles.briefMeaning}>
                                                    {expandedWordId !== word._id ? (word.contextMeaning ? (
                                                        isMobile
                                                            ? (word.contextMeaning.length > 20
                                                                ? word.contextMeaning.substring(0, 20) + '...'
                                                                : word.contextMeaning)
                                                            : (word.contextMeaning.length > 30
                                                                ? word.contextMeaning.substring(0, 30) + '...'
                                                                : word.contextMeaning)
                                                    ) : '') : ''}
                                                </p>
                                            </div>

                                            <div className={styles.cardActions}>
                                                <span className={styles.saveCount}>{word.saveCount || 0}次</span>

                                                {/* 非删除确认状态下显示的按钮 */}
                                                {deletingWordId !== word._id && (
                                                    <>
                                                        <button
                                                            className={styles.actionButton}
                                                            title={expandedWordId === word._id ? "收起详情" : "查看详情"}
                                                            onClick={(e) => handleExpandToggle(word._id, e)}
                                                        >
                                                            {expandedWordId === word._id ? "↑" : "↓"}
                                                        </button>

                                                        <button
                                                            className={styles.deleteButton}
                                                            title="删除单词"
                                                            onClick={(e) => handleDeleteConfirm(word._id, e)}
                                                        >
                                                            ×
                                                        </button>

                                                    </>
                                                )}

                                                {/* 删除确认状态下显示的确认按钮 */}
                                                {deletingWordId === word._id && (
                                                    <div className={styles.deleteConfirm}>
                                                        <span>确认删除?</span>
                                                        <div className={styles.confirmButtons}>
                                                            <button
                                                                className={styles.cancelButton}
                                                                onClick={handleCancelDelete}
                                                            >
                                                                取消
                                                            </button>
                                                            <button
                                                                className={styles.confirmButton}
                                                                onClick={(e) => handleDeleteWord(word._id, e)}
                                                                disabled={isDeleting}
                                                            >
                                                                {isDeleting ? '...' : '是'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 卡片详情部分 - 展开时可见 */}
                                        {expandedWordId === word._id && (
                                            <div className={styles.cardDetails}>
                                                <div className={styles.detailSection}>
                                                    <h3>词义</h3>
                                                    <p>{word.contextMeaning || ''}</p>
                                                </div>

                                                <div className={styles.detailSection}>
                                                    <h3>例句</h3>
                                                    <p className={styles.sentence}>{word.sentence || ''}</p>
                                                    <p className={styles.translatedSentence}>{word.meaning || ''}</p>
                                                </div>

                                                <div className={styles.detailSection}>
                                                    <h3>造句</h3>
                                                    <p className={styles.sentence}>{word.exampleSentence || ''}</p>
                                                    <p className={styles.translatedSentence}>{word.exampleSentenceMeaning || ''}</p>
                                                </div>

                                                <div className={styles.detailSection}>
                                                    <h3>词源</h3>
                                                    <p>{word.etymology || ''}</p>
                                                </div>

                                                {word.synonymsInContext && word.synonymsInContext.length > 0 && (
                                                    <div className={styles.detailSection}>
                                                        <h3>同义词</h3>
                                                        <div className={styles.synonyms}>
                                                            {word.synonymsInContext.map((synonym, index) => (
                                                                <span key={index} className={styles.synonym}>{synonym}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <button
                                                    className={`${styles.closeButton} ${isMobile ? styles.mobileCloseButton : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedWordId(null);
                                                    }}
                                                >
                                                    {isMobile ? '关闭' : '收起详情'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {renderPagination()}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default Vocabulary;