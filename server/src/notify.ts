export async function telegramSend(
  chatId: string | number | bigint,
  text: string,
) {
  const token = process.env.BOT_TOKEN;

  if (!token) return;

  try {
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: String(chatId),
          text,
        }),
      },
    );
  } catch (error) {
    console.error(
      'Telegram notification failed:',
      error,
    );
  }
}
