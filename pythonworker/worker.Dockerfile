# 使用官方 Python 镜像，选择一个适合您项目的版本
FROM python:3.13-slim

# 设置工作目录
WORKDIR /usr/src/app

# 复制依赖文件
COPY requirements.txt ./

# 安装 Python 依赖
# --no-cache-dir 可以减小镜像体积
RUN pip install --no-cache-dir -r requirements.txt

# 复制所有项目文件到工作目录
COPY . ./ # 将 python-worker-app 目录下的所有内容复制到容器的 /usr/src/app

# 容器启动时执行的命令
CMD [ "python", "src/your_worker_script.py" ] # 假设您的启动文件在 src 目录下