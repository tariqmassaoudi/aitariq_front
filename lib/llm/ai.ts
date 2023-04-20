import { ApiChatInput, ApiChatResponse } from '../../pages/api/openai/chat';
import { DMessage, useChatStore } from '@/lib/stores/store-chats';
import { fastChatModelId } from '@/lib/data';
import { useSettingsStore } from '@/lib/stores/store-settings';


/**
 * Main function to send the chat to the assistant and receive a response (streaming)
 */
export async function streamAssistantMessage(
  conversationId: string, assistantMessageId: string, history: DMessage[],
  apiKey: string | undefined, apiHost: string | undefined, apiOrganizationId: string | undefined,
  chatModelId: string, modelTemperature: number, modelMaxResponseTokens: number,
  editMessage: (conversationId: string, messageId: string, updatedMessage: Partial<DMessage>, touch: boolean) => void,
  abortSignal: AbortSignal,
  onFirstParagraph?: (firstParagraph: string) => void,
) {

  const payload: ApiChatInput = {
    api: {
      ...(apiKey && { apiKey }),
      ...(apiHost && { apiHost }),
      ...(apiOrganizationId && { apiOrganizationId }),
    },
    model: chatModelId,
    messages: history.map(({ role, text }) => ({
      role: role,
      content: text,
    })),
    temperature: modelTemperature,
    max_tokens: modelMaxResponseTokens,
  };
  console.log(history)

  try {

    const response = await fetch('http://3.89.242.109/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({"message": history.slice(-10).map(({text,sender})=>sender+": "+text).join('\n')}),
      signal: abortSignal,
    });

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      console.log(response.body)

      // loop forever until the read is done, or the abort controller is triggered
      let incrementalText = '';
      let parsedFirstPacket = false;
      let sentFirstParagraph = false;
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;
        
        incrementalText += decoder.decode(value, { stream: true })

        // there may be a JSON object at the beginning of the message, which contains the model name (streaming workaround)
        if (!parsedFirstPacket && incrementalText.startsWith('{')) {
          const endOfJson = incrementalText.indexOf('}');
          if (endOfJson > 0) {
            const json = incrementalText.substring(0, endOfJson + 1);
            incrementalText = incrementalText.substring(endOfJson + 1);
            try {
              const parsed = JSON.parse(json);
              editMessage(conversationId, assistantMessageId, { originLLM: parsed.model }, false);
              parsedFirstPacket = true;
            } catch (e) {
              // error parsing JSON, ignore
              console.log('Error parsing JSON: ' + e);
            }
          }
        }

        // if the first paragraph (after the first packet) is complete, call the callback
        if (parsedFirstPacket && onFirstParagraph && !sentFirstParagraph) {
          let cutPoint = incrementalText.lastIndexOf('\n');
          if (cutPoint < 0)
            cutPoint = incrementalText.lastIndexOf('. ');
          if (cutPoint > 100 && cutPoint < 400) {
            const firstParagraph = incrementalText.substring(0, cutPoint);
            onFirstParagraph(firstParagraph);
            sentFirstParagraph = true;
          }
        }

        editMessage(conversationId, assistantMessageId, { text: incrementalText }, false);
      }
    }

  } catch (error: any) {
    if (error?.name === 'AbortError') {
      // expected, the user clicked the "stop" button
    } else {
      // TODO: show an error to the UI
      console.error('Fetch request error:', error);
    }
  }

  // finally, stop the typing animation
  editMessage(conversationId, assistantMessageId, { typing: false }, false);
}


/**
 * Creates the AI titles for conversations, by taking the last 5 first-lines and asking AI what's that about
 */
export async function updateAutoConversationTitle(conversationId: string) {

  // // external state
  // const { conversations, setAutoTitle } = useChatStore.getState();

  // // only operate on valid conversations, without any title
  // const conversation = conversations.find(c => c.id === conversationId) ?? null;
  // if (!conversation || conversation.autoTitle || conversation.userTitle) return;

  // // first line of the last 5 messages
  // const historyLines: string[] = conversation.messages.slice(-5).filter(m => m.role !== 'system').map(m => {
  //   let text = m.text.split('\n')[0];
  //   text = text.length > 50 ? text.substring(0, 50) + '...' : text;
  //   text = `${m.role === 'user' ? 'You' : 'Assistant'}: ${text}`;
  //   return `- ${text}`;
  // });

  // // prepare the payload
  // const { apiKey, apiHost, apiOrganizationId } = useSettingsStore.getState();
  // const payload: ApiChatInput = {
  //   api: {
  //     ...(apiKey && { apiKey }),
  //     ...(apiHost && { apiHost }),
  //     ...(apiOrganizationId && { apiOrganizationId }),
  //   },
  //   model: fastChatModelId,
  //   messages: [
  //     { role: 'system', content: `You are an AI language expert who specializes in creating very concise and short chat titles.` },
  //     {
  //       role: 'user', content:
  //         'Analyze the given list of pre-processed first lines from each participant\'s conversation and generate a concise chat ' +
  //         'title that represents the content and tone of the conversation. Only respond with the lowercase short title and nothing else.\n' +
  //         '\n' +
  //         historyLines.join('\n') +
  //         '\n',
  //     },
  //   ],
  // };

  // try {
  //   const response = await fetch('http://127.0.0.1:8000/stream', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({"message":"What's your name?"}),
  //   });
  //   if (response.ok) {
  //     const chatResponse: ApiChatResponse = await response.json();
  //     const title = chatResponse.message?.content?.trim()
  //       ?.replaceAll('"', '')
  //       ?.replace('Title: ', '')
  //       ?.replace('title: ', '');
  //     if (title)
  //       setAutoTitle(conversationId, title);
  //   }
  // } catch (error: any) {
  //   console.error('updateAutoConversationTitle: fetch request error:', error);
  // }
}
