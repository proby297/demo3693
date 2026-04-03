# pythonworker/worker.py

import redis
import json
import os
import time
import sqlite3
from langdetect import detect, LangDetectException
import spacy
from janome.tokenizer import Tokenizer as JanomeTokenizer
from spacy.tokens import Token 
from spacy.language import Language

# --- 1. 数据库文件路径和全局连接 ---
DB_PATH = "/app/data/processed_dictionary.sqlite"
db_connection = None
try:
    db_connection = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True, check_same_thread=False)
    db_connection.row_factory = sqlite3.Row 
    print(f"✅ 成功连接到 SQLite 词典数据库: {DB_PATH}")
except sqlite3.Error as e:
    print(f"🚨 无法连接到 SQLite 词典数据库: {e}. Kaikki 词典功能将不可用。")
    db_connection = None 

SPACY_TO_KAIKKI_POS_MAP = {
    'de': {  # 德语
        'noun': ['noun'], 'propn': ['name', 'noun'], 'adj': ['adj'], 'adv': ['adv'],
        'verb': ['verb'], 'aux': ['verb'], 'det': ['det', 'article'], 'pron': ['pron'],
        'adp': ['prep', 'postp'], 'conj': ['conj'], 'cconj': ['conj'], 'sconj': ['conj', 'contraction'],
        'num': ['num'], 'intj': ['intj'], 'punct': ['punct'], 'sym': ['symbol'], 'part': ['particle'],
        'x': ['phrase', 'proverb']  # 🔑 只保留有意义的类型
    },
    'en': {  # 英语
        'noun': ['noun'], 'propn': ['name', 'noun'], 'adj': ['adj'], 'adv': ['adv'],
        'verb': ['verb'], 'aux': ['verb'], 'det': ['det', 'article'], 'pron': ['pron'],
        'adp': ['prep', 'prep_phrase'], 'conj': ['conj'], 'cconj': ['conj'], 'sconj': ['conj', 'contraction'],
        'num': ['num'], 'intj': ['intj'], 'punct': ['punct'], 'sym': ['symbol'], 'part': ['particle'],
        'x': ['phrase', 'proverb']  # 🔑 修正
    },
    'es': {  # 西班牙语
        'noun': ['noun'], 'propn': ['name', 'noun'], 'adj': ['adj'], 'adv': ['adv'],
        'verb': ['verb'], 'aux': ['verb'], 'det': ['det', 'article'], 'pron': ['pron'],
        'adp': ['prep'], 'conj': ['conj'], 'cconj': ['conj'], 'sconj': ['conj', 'contraction'],
        'num': ['num'], 'intj': ['intj'], 'punct': ['punct'], 'sym': ['symbol'], 'part': ['particle'],
        'x': ['phrase', 'proverb']  # 🔑 修正
    },
    'fr': {  # 法语
        'noun': ['noun'], 'propn': ['name', 'noun'], 'adj': ['adj'], 'adv': ['adv'],
        'verb': ['verb'], 'aux': ['verb'], 'det': ['det', 'article'], 'pron': ['pron'],  # 🔑 调整优先级
        'adp': ['prep', 'prep_phrase'], 'conj': ['conj'], 'cconj': ['conj'], 'sconj': ['conj', 'contraction'],
        'num': ['num'], 'intj': ['intj'], 'punct': ['punct'], 'sym': ['symbol'], 'part': ['particle'],
        'x': ['phrase', 'proverb']  # 🔑 修正
    },
    'it': {  # 意大利语
        'noun': ['noun'], 'propn': ['name', 'noun'], 'adj': ['adj'], 'adv': ['adv'],
        'verb': ['verb'], 'aux': ['verb'], 'det': ['det', 'article'], 'pron': ['pron'],
        'adp': ['prep', 'prep_phrase'], 'conj': ['conj'], 'cconj': ['conj'], 'sconj': ['conj', 'contraction'],
        'num': ['num'], 'intj': ['intj'], 'punct': ['punct'], 'sym': ['symbol'], 'part': ['particle'],
        'x': ['phrase', 'proverb']  # 🔑 修正
    },
    'pt': {  # 葡萄牙语
        'noun': ['noun'], 'propn': ['name', 'noun'], 'adj': ['adj'], 'adv': ['adv'],
        'verb': ['verb'], 'aux': ['verb'], 'det': ['det', 'article'], 'pron': ['pron'],
        'adp': ['prep'], 'conj': ['conj'], 'cconj': ['conj'], 'sconj': ['conj', 'contraction'],
        'num': ['num'], 'intj': ['intj'], 'punct': ['punct'], 'sym': ['symbol'], 'part': ['particle'],
        'x': ['phrase', 'proverb']  # 🔑 修正
    },
    'ru': {  # 俄语
        'noun': ['noun'], 'propn': ['name', 'noun'], 'adj': ['adj'], 'adv': ['adv'],
        'verb': ['verb'], 'aux': ['verb'], 'det': ['det'], 'pron': ['pron'],
        'adp': ['prep', 'postp'], 'conj': ['conj'], 'cconj': ['conj'], 'sconj': ['conj'],
        'num': ['num'], 'intj': ['intj'], 'punct': ['punct'], 'sym': ['symbol'], 'part': ['particle'],
        'x': ['phrase', 'proverb']  # 🔑 修正
    }
}

def get_possible_pos_values(lang_code, spacy_pos_lower):
    """将spaCy POS转换为Kaikki可能使用的POS列表"""
    if lang_code in SPACY_TO_KAIKKI_POS_MAP and spacy_pos_lower in SPACY_TO_KAIKKI_POS_MAP[lang_code]:
        return SPACY_TO_KAIKKI_POS_MAP[lang_code][spacy_pos_lower]
    return [spacy_pos_lower]  # 如果没有映射，返回原始标签
# --- 2. NLP 模型加载 (全局设置) ---
# --- 日语专用：Janome词性标注 → Kaikki POS映射表 ---
JANOME_TO_KAIKKI_POS_MAP = {
    # 基于真实Kaikki日语POS数据的映射
    '名詞': ['noun', 'name', 'character'],                    # 对应 noun(60545) + name(16774) + character(14509)
    '動詞': ['verb'],                                        # verb(12781)
    '形容詞': ['adj'],                                       # adj(3753)
    '副詞': ['adv'],                                         # adv(1625)
    '助詞': ['particle'],                                    # particle(196)
    '助動詞': ['verb', 'suffix'],                            # 可能是verb或suffix(592)
    '連体詞': ['adnominal'],                                 # adnominal(87)
    '接続詞': ['conj'],                                      # conj(149)
    '感動詞': ['intj'],                                      # intj(638)
    '記号': ['punct', 'symbol'],                             # punct(36) + symbol(77)
    
    # 详细子分类
    '名詞,一般': ['noun'],
    '名詞,固有名詞': ['name'],
    '名詞,数': ['num', 'counter'],                           # num(172) + counter(197)
    '名詞,代名詞': ['pron'],                                 # pron(337)
    '動詞,自立': ['verb'],
    '動詞,非自立': ['verb', 'suffix'],
    '形容詞,自立': ['adj'],
    '副詞,一般': ['adv'],
    '助詞,格助詞': ['particle'],
    '助詞,副助詞': ['particle'],
    '助詞,接続助詞': ['particle'],
    '感動詞': ['intj'],
}

def get_possible_pos_values_for_japanese(janome_pos):
    """基于真实Kaikki日语POS数据的映射"""
    # 先尝试完整匹配
    if janome_pos in JANOME_TO_KAIKKI_POS_MAP:
        return JANOME_TO_KAIKKI_POS_MAP[janome_pos]
    
    # 主要词性匹配
    main_pos = janome_pos.split(',')[0] if ',' in janome_pos else janome_pos
    if main_pos in JANOME_TO_KAIKKI_POS_MAP:
        return JANOME_TO_KAIKKI_POS_MAP[main_pos]
    
    # 基于真实数据的优先级（排除无意义类型）
    return [
        'noun', 'name', 'verb', 'adj', 'adv', 'phrase',
        'intj', 'suffix', 'pron', 'proverb', 'particle',
        'num', 'conj', 'adnominal', 'counter'
    ]

print("--- 正在加载NLP模型，请稍候... ---")
SPACY_MODEL_MAP = {
    'en': 'en_core_web_sm', 'fr': 'fr_core_news_sm', 'de': 'de_core_news_sm',
    'es': 'es_core_news_sm', 'pt': 'pt_core_news_sm', 'it': 'it_core_news_sm',
    'ru': 'ru_core_news_sm', 'ja': 'ja_core_news_sm', 
}
spacy_models = {}

# --- 3. 为 spaCy Token 注册自定义扩展属性 ---
if not Token.has_extension("kaikki_entry"):
    Token.set_extension("kaikki_entry", default=None)
    print("✅ 为 Token 注册了自定义属性 'kaikki_entry'")

# --- 辅助查询函数 (移到组件外部，以便 Janome 部分也能调用) ---
def query_kaikki_for_form(cursor: sqlite3.Cursor, lang_code: str, form_to_query: str, query_on_lemma_col: bool, current_pos_for_query: str | None) -> list[dict] | None:
    """
    查询 Kaikki 词典。
    如果 current_pos_for_query 为 None，则不使用 POS 进行过滤，可能返回多个具有不同原始 POS 的条目。
    否则，使用 POS 进行过滤。
    """
    results_list = []
    
    # 先定义列名
    column_to_query = "lemma" if query_on_lemma_col else "word_text"
    
    try:
        # 1. 先根据POS进行过滤查询
        sql_query_words = f"SELECT id, pos FROM words WHERE lang_code = ? AND {column_to_query} = ?"
        params_words = [lang_code, form_to_query]
        
        if current_pos_for_query is not None:
            # 获取可能的POS值列表
            if lang_code == 'ja':
                possible_pos_list = get_possible_pos_values_for_japanese(current_pos_for_query)
            else:
                possible_pos_list = get_possible_pos_values(lang_code, current_pos_for_query)
            
            # 构建IN查询
            pos_placeholders = ','.join(['?'] * len(possible_pos_list))
            sql_query_words += f" AND pos IN ({pos_placeholders})"
            params_words.extend(possible_pos_list)
        
        cursor.execute(sql_query_words, tuple(params_words))
        word_rows = cursor.fetchall()
        
        # 2. 只有在直接查询无结果时才考虑重定向
        if not word_rows:
            # 检查是否有soft-redirect
            cursor.execute("SELECT redirect_target FROM words WHERE lang_code = ? AND word_text = ? AND pos = 'soft-redirect'", 
                        (lang_code, form_to_query))
            redirect_row = cursor.fetchone()
            if redirect_row and redirect_row['redirect_target']:
                # 递归查询重定向目标，但保留原始POS过滤
                return query_kaikki_for_form(cursor, lang_code, redirect_row['redirect_target'],
                                         query_on_lemma_col, current_pos_for_query)
            
            # 检查是否是romanization查询（仅对日语）
            if lang_code == 'ja':
                cursor.execute("SELECT romanization_target FROM words WHERE lang_code = ? AND word_text = ? AND pos = 'romanization'", 
                            (lang_code, form_to_query))
                roman_row = cursor.fetchone()
                if roman_row and roman_row['romanization_target']:
                    # 查询罗马音对应的日语词，保留原始POS过滤
                    return query_kaikki_for_form(cursor, lang_code, roman_row['romanization_target'],
                                              query_on_lemma_col, current_pos_for_query)
            
            # 如果没有匹配，返回None
            return None

        # 3. 处理查询结果
        for word_row in word_rows:
            word_id = word_row["id"]
            kaikki_original_pos = word_row["pos"]

            # 1. 从数据库获取原始定义
            raw_definitions_from_db = []
            cursor.execute("SELECT gloss_text FROM senses WHERE word_id = ?", (word_id,))
            for sense_row in cursor.fetchall():
                # 仅当 gloss_text 存在 (不是 None) 时才添加
                if sense_row["gloss_text"] is not None:
                    raw_definitions_from_db.append(sense_row["gloss_text"])
            
            # 2. 清理和去重定义 (Rule 2)
            #    - 去除定义前后的空白字符
            #    - 过滤掉处理后变为空字符串的定义
            #    - 去除重复的定义，同时尽量保持原始顺序
            
            # 步骤 a: 清理（去除首尾空白）并过滤掉真正为空的定义
            cleaned_definitions_intermediate = []
            for definition_text in raw_definitions_from_db:
                # 确保是字符串类型才调用 strip，以防数据意外为其他类型
                if isinstance(definition_text, str):
                    stripped_definition = definition_text.strip()
                    if stripped_definition: # 只有非空字符串才保留
                        cleaned_definitions_intermediate.append(stripped_definition)
                # 如果不是字符串但您想保留（例如数字或其他），需要额外处理
                # 根据Kaiki的结构，gloss_text应该是文本
            
            # 步骤 b: 对清理后的定义进行去重 (使用 dict.fromkeys 保留顺序)
            if cleaned_definitions_intermediate:
                unique_definitions = list(dict.fromkeys(cleaned_definitions_intermediate))
            else:
                unique_definitions = []

            # 3. 剔除无效条目 (Rule 1)
            #    如果经过清理和去重后，定义列表为空，则不添加此条目。
            if not unique_definitions:
                continue # 跳过这个 word_id 的条目，处理下一个 word_row
            
            pronunciations = {}
            cursor.execute("SELECT pronunciation_text, type FROM pronunciations WHERE word_id = ?", (word_id,))
            for pron_row in cursor.fetchall():
                if pron_row["type"] not in pronunciations:
                    # 确保发音文本有效
                    if pron_row["pronunciation_text"] and isinstance(pron_row["pronunciation_text"], str) and pron_row["pronunciation_text"].strip():
                        pronunciations[pron_row["type"]] = pron_row["pronunciation_text"].strip()
            
            results_list.append({
                "definitions": unique_definitions, # 使用清理并去重后的定义
                "pronunciations": pronunciations if pronunciations else None,
                "kaikki_original_pos": kaikki_original_pos 
            })
        
        return results_list if results_list else None

    except sqlite3.Error as e:
        print(f"数据库查询错误 for '{form_to_query}' (lang: {lang_code}, pos: {current_pos_for_query}): {e}")
        return None
    except Exception as e_gen:
        print(f"查询Kaikki时发生未知错误 for '{form_to_query}': {e_gen}")
        return None

# --- 4. 自定义 spaCy 管线组件：Kaikki Enricher ---
@Language.component("kaikki_enricher")
def kaikki_enricher_component(doc):
    if not db_connection:
        return doc

    cursor = db_connection.cursor()
    
    for token in doc:
        if token.is_punct or token.is_space:
            continue

        lang_code = doc.lang_
        surface_text = token.text.lower()  # 转为小写
        lemma_text = token.lemma_.lower()   # 转为小写
        
        kaikki_info_aggregated = {}
        
        # 确定用于查询的 POS
        pos_for_spacy_query = None
        if lang_code != 'ja': # 对于非日语，使用转换后的小写POS
            pos_for_spacy_query = token.pos_.lower()
        # 对于日语 (lang_code == 'ja')，pos_for_spacy_query 保持 None，表示不使用 POS 过滤

        # 查询表面形式
        info_surface_list = query_kaikki_for_form(cursor, lang_code, surface_text, query_on_lemma_col=False, current_pos_for_query=pos_for_spacy_query)
        if info_surface_list:
            kaikki_info_aggregated["surface_match_entries"] = info_surface_list

        # 如果词元与表面形式不同，则查询词元
        if surface_text.lower() != lemma_text.lower():
            info_lemma_list = query_kaikki_for_form(cursor, lang_code, lemma_text, query_on_lemma_col=False, current_pos_for_query=pos_for_spacy_query)
            if info_lemma_list:
                kaikki_info_aggregated["lemma_match_entries"] = info_lemma_list
        
        if kaikki_info_aggregated:
            token._.set("kaikki_entry", kaikki_info_aggregated)
    return doc

# --- 5. 将自定义组件添加到每个 spaCy 模型管线中 ---
for lang, model_name in SPACY_MODEL_MAP.items():
    try:
        nlp = spacy.load(model_name)
        if "kaikki_enricher" not in nlp.pipe_names:
            pipe_to_add_after = "lemmatizer" if "lemmatizer" in nlp.pipe_names else \
                                "tagger" if "tagger" in nlp.pipe_names else \
                                None
            if pipe_to_add_after:
                 nlp.add_pipe("kaikki_enricher", after=pipe_to_add_after)
            else:
                 nlp.add_pipe("kaikki_enricher", last=True)
            print(f"✅ spaCy 模型 '{model_name}' 已添加 'kaikki_enricher' 组件。")
        else:
            print(f"ℹ️ spaCy 模型 '{model_name}' 已存在 'kaikki_enricher' 组件。")
        spacy_models[lang] = nlp
    except Exception as e:
        print(f"🚨 加载 spaCy 模型 '{model_name}' 或添加组件失败: {e}")

print("✅ 所有 spaCy 模型加载并配置完毕。")

janome_tokenizer = JanomeTokenizer() 
print("✅ Janome 日语分词器初始化完毕。")
print("---------------------------------")

# --- 6. 更新 intelligent_segmentation 函数 ---
def intelligent_segmentation(text: str, user_language: str) -> dict:
    print(f"开始处理文本: '{text[:30]}...' 用户指定语言: {user_language}")
    
    final_detected_language = "unknown"
    if user_language and user_language.lower() != 'auto':
        final_detected_language = user_language.lower()
        print(f"使用用户指定语言: {final_detected_language}")
    else:
        try:
            # 只有在用户未指定语言时才进行自动检测
            final_detected_language = detect(text)
            print(f"自动检测语言为: {final_detected_language}")
        except LangDetectException:
            print("警告: 无法自动识别出语言。如果用户也未指定，将无法进行特定语言处理。")
            # 此时 final_detected_language 仍为 "unknown"
    
    tokens_details = []
    entities_data = []
    
    if final_detected_language == 'ja':
        print("正在使用 Janome (日语) 分词器...")
        if db_connection: # 确保数据库连接可用
            cursor = db_connection.cursor() # 获取 cursor 以便多次使用
            for token_janome in janome_tokenizer.tokenize(text):
                kaikki_info_aggregated_janome = {}
                surface_form_ja = token_janome.surface
                base_form_ja = token_janome.base_form
                reading_ja = token_janome.reading     # 例如："タベル" 对于 "食べる"
                phonetic_ja = token_janome.phonetic   # 例如："タベル" 对于 "食べる"
                # 对于日语，我们不使用 POS 进行过滤查询
                # 🔑 使用日语POS映射进行查询
                janome_pos = token_janome.part_of_speech.split(',')[0]  # 获取主要词性
                possible_kaikki_pos_list = get_possible_pos_values_for_japanese(janome_pos)

                # 🔑 使用POS映射进行查询
                info_surface_ja_list = None
                for possible_pos in possible_kaikki_pos_list:
                    info_surface_ja_list = query_kaikki_for_form(cursor, final_detected_language, surface_form_ja, 
                                                            query_on_lemma_col=False, current_pos_for_query=possible_pos)
                    if info_surface_ja_list:
                        break

                # 如果POS过滤都查不到，最后尝试无POS过滤（保持原来的逻辑作为后备）
                if not info_surface_ja_list:
                    info_surface_ja_list = query_kaikki_for_form(cursor, final_detected_language, surface_form_ja, 
                                                            query_on_lemma_col=False, current_pos_for_query=None)

                if info_surface_ja_list:
                    kaikki_info_aggregated_janome["surface_match_entries"] = info_surface_ja_list

                # 对lemma查询也做相同处理
                if surface_form_ja.lower() != base_form_ja.lower():
                    info_lemma_ja_list = None
                    for possible_pos in possible_kaikki_pos_list:
                        info_lemma_ja_list = query_kaikki_for_form(cursor, final_detected_language, base_form_ja, 
                                                                query_on_lemma_col=False, current_pos_for_query=possible_pos)
                        if info_lemma_ja_list:
                            break
                    
                    # 后备查询
                    if not info_lemma_ja_list:
                        info_lemma_ja_list = query_kaikki_for_form(cursor, final_detected_language, base_form_ja, 
                                                                query_on_lemma_col=False, current_pos_for_query=None)
                    
                    if info_lemma_ja_list:
                        kaikki_info_aggregated_janome["lemma_match_entries"] = info_lemma_ja_list                
                tokens_details.append({
                    "text": surface_form_ja,
                    "lemma": base_form_ja,
                    "pos": token_janome.part_of_speech.split(',')[0], 
                    "is_stop": False, 
                    "reading_janome": reading_ja,    # <--- 新增 Janome 提供的读音
                    "phonetic_janome": phonetic_ja, # <--- 新增 Janome 提供的发音
                    "kaikki_entry": kaikki_info_aggregated_janome if kaikki_info_aggregated_janome else None
                })
        else: # 数据库连接不可用时的降级处理
            print("警告: Kaikki数据库连接不可用，Janome分词结果将不包含词典信息。")
            for token_janome in janome_tokenizer.tokenize(text):
                tokens_details.append({
                    "text": token_janome.surface, "lemma": token_janome.base_form,
                    "pos": token_janome.part_of_speech.split(',')[0], "is_stop": False, "kaikki_entry": None
                })


    elif final_detected_language in spacy_models:
        print(f"正在使用 spaCy ({final_detected_language}) 模型进行深度处理 (含Kaikki)...")
        nlp = spacy_models[final_detected_language]
        doc = nlp(text) 
        
        for token in doc:
            tokens_details.append({
                "text": token.text,
                "lemma": token.lemma_,
                "pos": token.pos_, 
                "is_stop": token.is_stop,
                "kaikki_entry": token._.kaikki_entry 
            })
        
        if nlp.has_pipe("ner"):
            for ent in doc.ents:
                entities_data.append({
                    "text": ent.text,
                    "label": ent.label_
                })
    else:
        print(f"警告: 语言 '{final_detected_language}' 不支持或无法识别，使用简单分割。")
        tokens_details = [{'text': word, 'lemma': word, 'pos': 'UNKNOWN', 'is_stop': False, 'kaikki_entry': None} for word in text.split()]

    print(f"分词及注解结果 (前3个token): {tokens_details[:3]}")
    if entities_data:
        print(f"命名实体识别结果 (前3个): {entities_data[:3]}")

    return {
        "language": final_detected_language,
        "tokens": tokens_details,
        "entities": entities_data,
        "originalText": text
    }

# --- 7. main 函数保持不变 ---
def main():
    # ... (内容与上一版本相同) ...
    redis_host = os.getenv('REDIS_HOST', 'redis')
    redis_port = int(os.getenv('REDIS_PORT', 6379))

    print("--- Python Worker 正在启动 ---")
    r = redis.Redis(host=redis_host, port=redis_port, db=0, decode_responses=True)
    queue_name = 'segmentation-tasks'
    channel_name = 'results-channel'
    print(f"Worker 正在监听队列 '{queue_name}'...")
    print(f"结果将会发布到频道 '{channel_name}'。")
    if not db_connection:
         print("🚨警告: 未能连接到Kaikki词典数据库，词典增强功能将不可用。")
    print("---------------------------------")

    while True:
        task_id = None 
        text_to_process = None
        user_lang_from_task = 'auto'
        try:
            _, task_data = r.brpop(queue_name)
            task = json.loads(task_data)
            task_id = task.get('id')
            text_to_process = task.get('text')
            user_lang_from_task = task.get('user_language', 'auto') 
            
            print(f"\n✅ 收到新任务: {task_id} (语言指定: {user_lang_from_task})")
            
            segmentation_result = intelligent_segmentation(text_to_process, user_lang_from_task)
            
            segmentation_result['taskId'] = task_id
            result_json = json.dumps(segmentation_result, ensure_ascii=False)
            r.publish(channel_name, result_json)
            
            print(f"✅ 已发布任务结果: {task_id}")
            
        except redis.exceptions.ConnectionError as e_redis:
            print(f"🚨 Redis 连接错误: {e_redis}. 正在尝试重新连接...")
            time.sleep(5)
        except Exception as e_task:
            print(f"🚨 处理任务 {task_id if task_id else '未知'} 时发生未知错误: {e_task}")
            if task_id and r: 
                 error_payload = {
                    "taskId": task_id,
                    "error": f"处理任务时发生错误: {str(e_task)}",
                    "language": user_lang_from_task,
                    "originalText": text_to_process if text_to_process else "",
                    "tokens": [],
                    "entities": []
                }
                 try:
                    r.publish(channel_name, json.dumps(error_payload, ensure_ascii=False))
                    print(f"⚠️ 已为任务 {task_id} 发布错误信息到 Redis。")
                 except Exception as e_publish_err:
                    print(f"🚨 发布任务 {task_id} 的错误信息到 Redis 时失败: {e_publish_err}")

if __name__ == "__main__":
    main()