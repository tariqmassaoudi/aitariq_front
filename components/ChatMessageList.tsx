import * as React from 'react';
import { shallow } from 'zustand/shallow';

import { Box, List } from '@mui/joy';
import { SxProps } from '@mui/joy/styles/types';

import { ChatMessage } from '@/components/ChatMessage';
import { PurposeSelector } from '@/components/util/PurposeSelector';
import { createDMessage, DMessage, useChatStore } from '@/lib/stores/store-chats';
import { useSettingsStore } from '@/lib/stores/store-settings';


/**
 * A list of ChatMessages
 */
export function ChatMessageList(props: { conversationId: string | null, onRestartConversation: (conversationId: string, history: DMessage[]) => void, sx?: SxProps }) {
  // external state
  const showSystemMessages = useSettingsStore(state => state.showSystemMessages);
  const { editMessage, deleteMessage } = useChatStore(state => ({ editMessage: state.editMessage, deleteMessage: state.deleteMessage }), shallow);
  const messages = useChatStore(state => {
    const conversation = state.conversations.find(conversation => conversation.id === props.conversationId);
    return conversation ? conversation.messages : [];
  }, shallow);


  const handleMessageDelete = (messageId: string) =>
    props.conversationId && deleteMessage(props.conversationId, messageId);

  const handleMessageEdit = (messageId: string, newText: string) =>
    props.conversationId && editMessage(props.conversationId, messageId, { text: newText }, true);

  const handleRunFromMessage = (messageId: string, offset: number) => {
    const truncatedHistory = messages.slice(0, messages.findIndex(m => m.id === messageId) + offset + 1);
    props.conversationId && props.onRestartConversation(props.conversationId, truncatedHistory);
  };

  const handleRunPurposeExample = (text: string) =>
    props.conversationId && props.onRestartConversation(props.conversationId, [...messages, createDMessage('user', text)]);


  // hide system messages if the user chooses so
  // NOTE: reverse is because we'll use flexDirection: 'column-reverse' to auto-snap-to-bottom
  const filteredMessages = messages.filter(m => m.role !== 'system' || showSystemMessages).reverse();

  // when there are no messages, show the purpose selector
  if (!filteredMessages.length)
    return props.conversationId ? (
      <Box sx={{margin:"auto"}|| {}}>
        <PurposeSelector conversationId={props.conversationId} runExample={handleRunPurposeExample} />
      </Box>
    ) : null;

  // scrollbar style
  // const scrollbarStyle: SxProps = {
  //   '&::-webkit-scrollbar': {
  //     md: {
  //       width: 8,
  //       background: theme.vars.palette.neutral.plainHoverBg,
  //     },
  //   },
  //   '&::-webkit-scrollbar-thumb': {
  //     background: theme.vars.palette.neutral.solidBg,
  //     borderRadius: 6,
  //   },
  //   '&::-webkit-scrollbar-thumb:hover': {
  //     background: theme.vars.palette.neutral.solidHoverBg,
  //   },
  // };

  return (
    <List sx={{
      p: 0, ...(props.sx || {}),
      // this makes sure that the the window is scrolled to the bottom (column-reverse)
      display: 'flex', flexDirection: 'column-reverse',
      // fix for the double-border on the last message (one by the composer, one to the bottom of the message)
      marginBottom: '-1px',
    }}>

      {filteredMessages.map((message, idx) =>
        <ChatMessage
          key={'msg-' + message.id}
          message={message}
          isBottom={idx === 0}
          onMessageDelete={() => handleMessageDelete(message.id)}
          onMessageEdit={newText => handleMessageEdit(message.id, newText)}
          onMessageRunFrom={(offset: number) => handleRunFromMessage(message.id, offset)} />,
      )}

    </List>
  );
}