## 实验三
启动虚拟机
```bash
VM:
sudo docker start HostU HostU2 HostV
sudo docker exec -it HostU /bin/bash
sudo docker exec -it HostU2 /bin/bash
sudo docker exec -it HostV /bin/bash
```

给 HostU 和 HostU2 添加 hosts
```bash
HostU, HostU2:
echo "10.0.2.8 ycg.com" >> /etc/hosts
```

生成证书
```bash
cd myvpn/cert_server
cp /usr/lib/ssl/openssl.cnf ./
mkdir demoCA
cd demoCA
mkdir certs crl newcerts
touch index.txt serial
echo 1000 > serial 
# 设置证书的初始序列号

openssl req -new -x509 -keyout ca-ycg-key.pem -out ca-ycg-crt.pem -config openssl.cnf
# 生成 CA 的私钥（ca-ycg-key.pem）和自签名根证书（ca-ycg-crt.pem）
openssl genrsa -des3 -out server-ycg-key.pem 2048
# 生成服务器的 RSA 私钥
openssl req -new -key server-ycg-key.pem -out server-ycg-csr.pem -config openssl.cnf
# 生成证书签名请求 (CSR)
openssl ca -in server-ycg-csr.pem -out server-ycg-crt.pem -cert ca-ycg-crt.pem -keyfile ca-ycg-key.pem -config openssl.cnf
# 使用第一部分创建的 CA 私钥对服务器的 CSR 进行签名，生成服务器证书 server-ycg-crt.pem
```

![[Pasted image 20251223213550.png]]

运行 vpn
```bash
VM:
sudo ./myser # input 123456

HostU:
./mycli ycg.com 4433 seed dees 2

HostU2:
./mycli ycg.com 4433 seed dees 5

# 4433 TCP port
# seed user name
# dees user password
# 5 do "sudo ifconfig tun0 192.168.53.5/24 up"
```

### 认证 VPN 服务器
#### 证书主题包含个人信息
```bash
VM:
sudo ./myser

HostU:
./mycli ycg.com 4433 seed dees 2
```
![[Pasted image 20251223211657.png]]

#### VPN 客户端提示证书过期
使用命令 faketime 伪造时间为 '2035-09-09 00:00:00'，提示证书已经过期
```bash
VM:
sudo ./myser

HostU:
faketime '2035-09-09 00:00:00' ./mycli ycg.com 4433 seed dees 2
```

![[Pasted image 20251223212538.png]]

### 认证 VPN 客户端
#### 提示错误无法登录
```bash
VM:
sudo ./myser

HostU:
./mycli ycg.com 4433 seed dees1 2
```
![[Pasted image 20251223213045.png]]

#### 能正确登录
见 `认证 VPN 服务器 - 证书主题包含个人信息`

### 加密隧道通信
wireshark 监听 docker1 端口
修改 wireshark 配置：
Preferences - Protocols - HTTP 
![[Pasted image 20251223214152.png]]

#### 能通信
vpn 连接后，在 HostU 上输入 `ping 192.168.60.101`，可以 ping 通
![[Pasted image 20251223214418.png]]

#### 经隧道封装 & 隧道为 TLS
观察刚才 `ping 192.168.60.101` 时 wireshark 抓包的内容
![[Pasted image 20251223214507.png]]

### 支持多客户端
#### 各自正常登录通信
```bash
VM:
sudo ./myser # input 123456

HostU:
./mycli ycg.com 4433 seed dees 2
telnet 192.168.60.101

HostU2:
./mycli ycg.com 4433 seed dees 5
telnet 192.168.60.101
```

先都连接 VPN
![[Pasted image 20251223214936.png]]

然后执行 `telnet` 命令
需要现在 HostV 上启用 telnet 服务：
```bash
HostV:
sudo /usr/sbin/inetd
```
![[Pasted image 20251223215816.png]]

#### 隧道保持，通信不受影响
端口 HostU2 的 telnet，然后断开 HostU2 的客户端连接；在 HostU 上执行命令 `whoami`，仍能得到正确响应
![[Pasted image 20251223220019.png]]

### 易用性和稳定性
**相关代码**
mycli.c: Line 159 - 163
```c
// redirect and routing
char cmd[100];
sprintf(cmd, "sudo ifconfig tun0 192.168.53.%s/24 up && sudo route add -net 192.168.60.0/24 tun0",
        argv[5]);
system(cmd);
```
#### VPN 客户端虚拟 IP 获取
手动分配：获取分配的2和5 则ip是192.168.53.2和192.168.53.5
mycli.c: Line 162, `argc[5]`

#### VPN 客户端虚拟 IP 配置
自动添加：自动配置的192.168.53.2和192.168.53.5
mycli.c: Line 161, `sudo ifconfig tun0 192.168.53.%s/24 up`

#### VPN 客户端内网路由配置
自动添加
mycli.c: Line 161, `sudo route add -net 192.168.60.0/24 tun0`

#### 正常使用时的稳定性
王婆卖瓜

### 相关代码
- mycli.c
1. 连接与初始化: `setupTLSClient` 初始化 OpenSSL 上下文并加载 CA 证书用于验证服务器；`setupTCPClient` 创建 TCP 套接字并连接服务器；随后通过 `SSL_connect` 完成 TLS 握手
2. 身份认证: 握手成功后，客户端通过 `SSL_write` 依次发送用户名、密码以及申请的虚拟 IP 后缀（`last_ip`）给服务器进行验证
3. 虚拟网卡配置: 调用 `createTunDevice` 打开 `/dev/net/tun` 设备；使用 `system` 函数执行 shell 命令，配置 tun0 接口的 IP 地址（192.168.53.x）并添加路由规则
4. 上行流量处理 (TUN -> SSL): 创建一个子线程运行 `listen_tun` 函数。该函数循环读取 TUN 设备捕获的数据包，检查数据包是否为 IPv4 且源 IP 符合预期，若符合则通过 `SSL_write` 加密发送给服务器
5. 下行流量处理 (SSL -> TUN): 主线程进入 `do-while` 循环，通过 `SSL_read` 接收并解密服务器发来的数据，然后使用 `write` 将数据写入 TUN 设备，由操作系统内核进行后续路由处理

- myser.c
1. 服务初始化: `setupTLSServer` 加载服务器证书和私钥；`setupTCPServer` 监听 4433 端口；`createTunDevice` 创建 TUN 设备并配置网关 IP（192.168.53.1）及开启内核 IP 转发
2. 全局路由分发 (TUN -> Pipe): 主线程创建一个 `listen_tun` 线程，持续读取服务端 TUN 设备的数据包。它解析目的 IP 地址的最后一个字节，将数据包写入 `./pipe/` 目录下对应的命名管道文件，实现将回包分发给指定客户端的逻辑
3. 并发处理: 主循环使用 `accept` 接收客户端连接，并调用 `fork` 创建子进程处理每个独立的客户端会话
4. 认证与会话建立 (子进程): 子进程完成 `SSL_accept` 握手后，读取客户端发来的凭证，调用 `login` 函数结合 `getspnam` 和 `crypt` 校验 Linux 系统用户的影子密码。验证通过后，根据客户端申请的 IP 使用 `mkfifo` 创建命名管道
5. 发送 (Pipe -> SSL): 创建 `listen_pipe` 线程，读取对应 IP 命名管道中的数据（由步骤 2 中的全局线程写入），通过 `SSL_write` 发送给客户端
6. 接收 (SSL -> TUN): 主逻辑调用 `sendOut` 函数，通过 `SSL_read` 读取客户端发来的加密数据，解密后直接写入服务端的 TUN 设备
