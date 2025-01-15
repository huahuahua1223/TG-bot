import { NextRequest } from 'next/server';

const TELEGRAM_API = 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN;

// 发送消息到 Telegram
async function sendMessage(chatId: number, text: string) {
  console.log('开始发送消息到 Telegram');
  console.log('目标 URL:', `${TELEGRAM_API}/sendMessage`);
  console.log('发送内容:', { chatId, text });

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
      // 添加超时设置
      signal: AbortSignal.timeout(10000), // 10 秒超时
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API 响应错误:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Telegram API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Telegram API 响应成功:', result);
    return result;
  } catch (error) {
    console.error('发送消息时出错:', error);
    throw error;
  }
}

// 处理命令的函数
async function handleCommand(chatId: number, command: string) {
  console.log(`处理命令: ${command} 来自聊天ID: ${chatId}`);
  try {
    switch(command) {
      case '/start':
        return await sendMessage(chatId, '👋 欢迎使用此机器人！\n输入 /help 查看所有可用命令。');
      
      case '/help':
        return await sendMessage(
          chatId,
          '📝 可用命令列表：\n' +
          '/start - 开始使用\n' +
          '/help - 显示此帮助信息\n' +
          '/echo [文本] - 复读你的消息\n' +
          '/time - 显示当前时间'
        );
      
      case '/time':
        const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        return await sendMessage(chatId, `🕒 当前北京时间：${now}`);
      
      default:
        if (command.startsWith('/echo ')) {
          const text = command.slice(6); // 删除 "/echo " 前缀
          return await sendMessage(chatId, text);
        }
        return await sendMessage(chatId, '❌ 未知命令，请使用 /help 查看可用命令');
    }
  } catch (error) {
    console.error('处理命令时出错:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  console.log('收到 GET 请求');
  // 测试 Telegram API 连接
  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const data = await response.json();
    return new Response(JSON.stringify({ status: 'ok', bot: data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('测试连接时出错:', error);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function POST(req: NextRequest) {
  console.log('收到 POST 请求');
  try {
    const data = await req.json();
    console.log('收到的数据:', JSON.stringify(data, null, 2));
    
    // 处理收到的消息
    if (data.message?.text) {
      const chatId = data.message.chat.id;
      const text = data.message.text;
      console.log(`收到消息: ${text} 来自聊天ID: ${chatId}`);
      
      // 处理命令
      if (text.startsWith('/')) {
        await handleCommand(chatId, text);
      }
    }
    
    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('处理 webhook 时出错:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
} 