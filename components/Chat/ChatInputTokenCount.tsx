import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import HomeContext from '@/pages/api/home/home.context';

import {
  TiktokenModel,
  getEncoding,
  getEncodingNameForModel,
  Tiktoken
} from 'js-tiktoken';

import BigNumber from 'bignumber.js';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

const PRICING: Record<string, BigNumber> = {
  'gpt-4': BigNumber('0.03').div(1000),
  'gpt-4-32k': BigNumber('0.03').div(1000),
  'gpt-3.5-turbo': BigNumber('0.002').div(1000),
};

export function ChatInputTokenCount(props: { content: string | undefined }) {
  const { t } = useTranslation('chat');
  const {
    state: { selectedConversation },
  } = useContext(HomeContext);

  const [tokenizer, setTokenizer] = useState<Tiktoken | null>(null);

  useEffect(() => {
    let encoding;
    const model = selectedConversation?.model;

    if (model) {
      const encodingForModel = getEncodingNameForModel(model.id as TiktokenModel);
      encoding = getEncoding(encodingForModel);
    } else {
      encoding = getEncoding('cl100k_base');
    }

    setTokenizer(encoding);
  }, [selectedConversation?.model]);

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: selectedConversation?.prompt ?? '' },
    ...(selectedConversation?.messages ?? []),
    { role: 'user', content: props.content ?? '' },
  ];

  const isGpt3 = selectedConversation?.model.id.startsWith('gpt-3.5-turbo');
  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serialized = [
    messages
      .map(({ role, content }) => {
        return `<|im_start|>${role}${roleSep}${content}<|im_end|>`;
      })
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  const count = tokenizer?.encode(serialized, 'all').length;
  const pricing: BigNumber | undefined =
    PRICING[selectedConversation?.model.id || 'gpt-3.5-turbo'];


  if (pricing == null || count == null) return null;

  const {tokenLimit} = OpenAIModels[selectedConversation?.model.id as OpenAIModelID];
  const cappedCount = count > (tokenLimit || 0) ? tokenLimit : count;

  return (
    <div className="bg-opacity-10 bg-neutral-300 rounded-full py-1 px-2 text-neutral-400 pointer-events-auto">
      {t('{{count}} tokens / ${{price}}', {
        count: cappedCount,
        price: pricing.multipliedBy(cappedCount).toFixed(),
      })}
    </div>
  );
}
