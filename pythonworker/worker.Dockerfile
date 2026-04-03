
# 使用官方 Python 镜像，选择一个适合您项目的版本
FROM python:3.13-slim

# 2. 设置工作目录，这是容器内部的“当前文件夹”。
WORKDIR /app

# 3. 复制依赖文件。这是第一步，以便利用 Docker 的缓存机制。
COPY requirements.txt .

# 4. 安装 Python 依赖。
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm && \
    python -m spacy download es_core_news_sm && \
    python -m spacy download pt_core_news_sm && \
    python -m spacy download fr_core_news_sm && \
    python -m spacy download it_core_news_sm && \
    python -m spacy download de_core_news_sm && \
    python -m spacy download ru_core_news_sm && \
    python -m spacy download ja_core_news_sm 


# 5. 【修正】精确地复制我们需要的 Python 脚本文件。
#    我们只复制 worker.py，而不是用 'COPY . .' 来复制所有东西。
COPY worker.py .

# 6. 【修正】使用官方推荐的 Exec 格式来设置启动命令。
#    - 我们直接运行根目录下的 'worker.py'。
#    - 使用 '-u' 参数确保日志能实时输出。
CMD ["python", "-u", "worker.py"]