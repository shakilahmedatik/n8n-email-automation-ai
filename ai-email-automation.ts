import {
  workflow,
  node,
  trigger,
  switchCase,
  languageModel,
  outputParser,
  newCredential,
  placeholder,
  expr
} from '@n8n/workflow-sdk';

/**
 * 1. Gmail Trigger Node
 * Polls unread emails every minute. Full email body and metadata are fetched
 * (simple: false) to give the AI analyzer complete context.
 */
const gmailTrigger = trigger({
  type: 'n8n-nodes-base.gmailTrigger',
  version: 1.4,
  config: {
    name: 'Gmail Trigger',
    parameters: {
      pollTimes: {
        item: [{ mode: 'everyMinute' }]
      },
      simple: false,
      filters: {
        readStatus: 'unread'
      }
    },
    credentials: {
      gmailOAuth2: newCredential('Gmail OAuth2')
    }
  },
  output: [
    {
      id: 'msg_001',
      threadId: 'thread_001',
      from: 'client@example.com',
      subject: 'Contract and Pricing Quotation Request',
      snippet: 'Could you please send us the enterprise contract and quote?',
      text: 'Hello team,\n\nCould you please send us the enterprise contract terms and pricing quotation for 50 seats?\n\nBest regards,\nClient',
      date: 'Sun, 6 Sep 2026 03:00:00 +0000'
    }
  ]
});

/**
 * 2. OpenAI GPT-5 Model Subnode
 * Connected to AI Agent. Temperature is set low (0.1) for deterministic classification.
 */
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI GPT-5 Model',
    parameters: {
      model: {
        __rl: true,
        mode: 'id',
        value: 'gpt-5-mini'
      },
      options: {
        temperature: 0.1
      }
    },
    credentials: {
      openAiApi: newCredential('OpenAI API')
    }
  }
});

/**
 * 3. Structured Output Parser Subnode
 * Enforces JSON output with classification, priority, reason, summary, and draft response.
 */
const structuredParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Structured Output Parser',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: JSON.stringify({
        classification: 'HUMAN_APPROVAL',
        priority: 'High',
        reason: 'Involves pricing and contract terms requiring mandatory human review',
        summary: 'Client requested enterprise pricing and contract quotation for 50 seats',
        draft_response: 'Hello,\n\nThank you for reaching out to us. We have received your inquiry regarding enterprise contract terms and pricing for 50 seats. Our account executive is reviewing your requirements and will provide a detailed proposal shortly.\n\nBest regards,\nSales Team'
      })
    }
  }
});

/**
 * 4. AI Email Analyzer & Drafter Node
 * Analyzes incoming message context and strictly applies business rules.
 */
const emailAnalyzer = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'AI Email Analyzer',
    parameters: {
            promptType: 'define',
      text: expr(
        'Analyze the following incoming email message:\n' +
        'Sender Name: {{ $json.from?.value?.[0]?.name || ($json.from?.text && !$json.from.text.startsWith($json.from?.value?.[0]?.address || \'@\') ? $json.from.text.split(\'<\')[0].replace(/"/g, \'\').trim() : \'\') || \'Valued Customer\' }}\n' +
        'Sender Email: {{ $json.from?.value?.[0]?.address || ($json.from?.text ? ($json.from.text.match(/<([^>]+)>/) ? $json.from.text.match(/<([^>]+)>/)[1] : $json.from.text) : \'\') || $json.from }}\n' +
        'Subject: {{ $json.subject }}\n' +
        'Thread ID: {{ $json.threadId }}\n' +
        'Date: {{ $json.date }}\n\n' +
        'Body:\n{{ $json.text || $json.snippet }}'
      ),
      hasOutputParser: true,
      options: {
        systemMessage:
          'You are an expert AI email triage and drafting agent.\n\n' +
          'BUSINESS PROFILE & KNOWLEDGE BASE:\n' +
          '- Organization / Company: Atik Automation\n' +
          '- Office Hours: Monday to Friday, 9:00 AM – 6:00 PM (GMT+6) (Closed on Saturday and Sunday)\n' +
          '- Physical Location / Office Address: Dhaka, Bangladesh (Our team also operates globally and remotely)\n' +
          '- Contact Email: support@atikautomation.com\n' +
          '- Services: AI workflow automation, email management systems, and technical consulting\n' +
          '- Default Sign-off / Signature:\nBest regards,\nAtik & The Automation Team\n\n' +
          'RESPONSE DRAFTING RULES:\n' +
          '- Greet the sender personally by their actual name from "Sender Name" (e.g., "Dear Atik," or "Hi Atik,"). If the name is "Valued Customer" or unknown, greet with "Hi there," or "Hello,".\n' +
          '- Use the concrete details from the BUSINESS PROFILE above to answer questions regarding office hours, office address/location, contact info, or general company questions.\n' +
          '- STRICT PROHIBITION ON PLACEHOLDERS: NEVER use bracketed placeholders like "[Sender\'s Name]", "[Office Address]", "[Your Name]", "[Company Name]", or "[Link]". All details must be fully filled in and ready to be dispatched to the recipient without human editing.\n' +
          '- Write in a polite, professional, and helpful tone.\n' +
          '- Use standard paragraphs with double newlines between paragraphs.\n\n' +
          'CLASSIFICATION RULES:\n\n' +
          '1. AUTO_REPLY (Direct Automated Reply):\n' +
          '   - Select this ONLY when the sender is asking a genuine question or request that requires an email response, and can be safely answered directly by AI (e.g. office hours, address/location, FAQs, public info, routine updates, or greetings accompanied by a question).\n' +
          '   - The email MUST expect a reply. draft_response MUST contain a complete, courteous, ready-to-send answer.\n' +
          '   - If the email does NOT need an answer (such as a simple "Thank you" or acknowledgment), do NOT select AUTO_REPLY!\n' +
          '   - CRITICAL: AUTO_REPLY with an empty draft_response is STRICTLY FORBIDDEN. If you cannot write a meaningful reply, classify as NO_REPLY instead.\n\n' +
          '2. HUMAN_APPROVAL (Requires Human Review):\n' +
          '   - Select this whenever the email requires human judgment, special authority, or triggers ANY Mandatory Human Approval Rule below.\n' +
          '   - You MUST generate a professional, context-aware preliminary draft in draft_response for the human reviewer.\n\n' +
          '3. NO_REPLY (Silently Ignore - No Response Needed):\n' +
          '   - Select this for ANY email where NO response should be sent back. This includes:\n' +
          '     a) Conversational acknowledgments & pleasantries that do NOT ask any new questions or expect any response. Examples:\n' +
          '        - "Thank you!", "Thanks!", "Thank you for your response"\n' +
          '        - "Got it, thanks!", "Noted", "Understood", "Acknowledged"\n' +
          '        - "Okay, sounds good", "Perfect, thanks!", "Great, thank you!"\n' +
          '        - "Have a great day", "Happy holidays!"\n' +
          '        - Short replies to a previous answer that simply confirm receipt without asking anything new\n' +
          '     b) Automated / Transactional mail: Newsletters, marketing campaigns, spam, cold sales pitches, automated receipts, system alerts, no-reply transactional notifications, or delivery failure notices.\n' +
          '   - draft_response MUST be an empty string ("").\n' +
          '   - NEVER select AUTO_REPLY if draft_response is empty! If no response is needed, it is ALWAYS NO_REPLY.\n\n' +
          'MANDATORY HUMAN APPROVAL RULES:\n' +
          'You MUST classify as HUMAN_APPROVAL (Priority: High or Medium) if the email involves ANY of the following:\n' +
          '- Pricing, quotes, discounts, rates, or financial proposals\n' +
          '- Contracts, agreements, NDAs, terms, legal matters, or disputes\n' +
          '- Refunds, billing issues, chargebacks, or claims\n' +
          '- Complaints, dissatisfaction, or escalations\n' +
          '- Business negotiations or partnership terms\n' +
          '- Deadlines, milestones, or project commitments\n' +
          '- Sensitive, proprietary, or confidential data\n' +
          '- Important or VIP client communications\n\n' +
          'CRITICAL CONSTRAINTS & VALIDATION CHECKLIST (apply BEFORE returning):\n' +
          '- If classification is AUTO_REPLY → draft_response MUST be a non-empty, complete, ready-to-send email. If it is empty, CHANGE classification to NO_REPLY.\n' +
          '- If classification is HUMAN_APPROVAL → draft_response MUST be a non-empty preliminary draft for the reviewer.\n' +
          '- If classification is NO_REPLY → draft_response MUST be exactly an empty string "".\n' +
          '- NEVER return AUTO_REPLY with an empty draft_response. This is the single most important rule.\n\n' +
          'You MUST return a valid JSON object matching the schema with these exact 5 fields:\n' +
          '- classification: Exactly "AUTO_REPLY", "HUMAN_APPROVAL", or "NO_REPLY"\n' +
          '- priority: Exactly "High", "Medium", or "Low"\n' +
          '- reason: Concise explanation of why this classification and priority were chosen\n' +
          '- summary: A 1-2 sentence executive summary of the email\n' +
          '- draft_response: The response draft (or empty string "" for NO_REPLY)'
      }
    },
    subnodes: {
      model: openAiModel,
      outputParser: structuredParser
    }
  },
  output: [
    {
      classification: 'HUMAN_APPROVAL',
      priority: 'High',
      reason: 'Involves pricing and contract terms requiring mandatory human review',
      summary: 'Client requested enterprise pricing and contract quotation for 50 seats',
      draft_response: 'Hello, Thank you for reaching out...',
      is_mandatory_human_review: true
    }
  ]
});

/**
 * 5. Route by Classification Switch Node
 * Case 0: AUTO_REPLY
 * Case 1: HUMAN_APPROVAL
 * Case 2 (fallback): NO_REPLY
 */
const routeClassification = switchCase({
  version: 3.4,
  config: {
    name: 'Route by Classification',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            outputKey: 'AUTO_REPLY',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr("{{ (() => { const cls = $json.output?.classification || $json.classification || ''; const draft = String($json.output?.draft_response ?? $json.draft_response ?? '').trim(); return cls === 'AUTO_REPLY' && draft.length === 0 ? 'NO_REPLY' : cls; })() }}"),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'AUTO_REPLY'
                }
              ],
              combinator: 'and'
            }
          },
          {
            outputKey: 'HUMAN_APPROVAL',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr('{{ $json.output?.classification || $json.classification }}'),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'HUMAN_APPROVAL'
                }
              ],
              combinator: 'and'
            }
          }
        ]
      },
      options: {
        fallbackOutput: 'extra',
        renameFallbackOutput: 'NO_REPLY'
      }
    }
  },
  output: [
    {
      classification: 'AUTO_REPLY',
      priority: 'Low',
      reason: 'General safe inquiry',
      summary: 'Asking for public documentation',
      draft_response: 'Here is the documentation link...',
      is_mandatory_human_review: false
    }
  ]
});

/**
 * 6. Send Auto Reply Node (Gmail reply)
 * Replies to the specific message and original thread.
 */
const sendAutoReply = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Send Auto Reply',
    parameters: {
      resource: 'message',
      operation: 'reply',
      messageId: expr("{{ $('Gmail Trigger').item.json.id }}"),
      emailType: 'html',
      message: expr("{{ ($json.output?.draft_response || $json.draft_response)?.replace(/\\n/g, '<br>') }}"),
      options: {
        appendAttribution: false
      }
    },
    credentials: {
      gmailOAuth2: newCredential('Gmail OAuth2')
    }
  },
  output: [
    {
      id: 'reply_001',
      threadId: 'thread_001'
    }
  ]
});

/**
 * 7. Notify Auto Reply Dispatched (Telegram notification)
 */
const notifyAutoReplied = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Notify Auto Reply Dispatched',
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: placeholder('Telegram Chat ID'),
      text: expr(
        '🤖 <b>Auto-Reply Sent</b>\n\n' +
        '<b>To:</b> {{ $(\'Gmail Trigger\').item.json.from?.value?.[0]?.name ? ($(\'Gmail Trigger\').item.json.from.value[0].name + \' (\' + $(\'Gmail Trigger\').item.json.from.value[0].address + \')\') : ($(\'Gmail Trigger\').item.json.from?.value?.[0]?.address || $(\'Gmail Trigger\').item.json.from?.text?.replace(/</g, \'(\').replace(/>/g, \')\') || $(\'Gmail Trigger\').item.json.from) }}\\n' +
        '<b>Subject:</b> {{ $(\'Gmail Trigger\').item.json.subject }}\n' +
        '<b>Priority:</b> {{ ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).priority }}\n' +
        '<b>Reason:</b> {{ ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).reason }}\n\n' +
        '<b>Response:</b>\n{{ ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).draft_response }}'
      ),
      additionalFields: {
        parse_mode: 'HTML',
        appendAttribution: false
      }
    },
    credentials: {
      telegramApi: newCredential('Telegram Bot')
    }
  },
  output: [
    {
      ok: true
    }
  ]
});

/**
 * 8. Telegram Approval Request Node (sendAndWait customForm)
 * Provides interactive Approve, Edit & Send, and Reject options.
 */
const telegramApprovalRequest = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Telegram Approval Request',
    parameters: {
      resource: 'message',
      operation: 'sendAndWait',
      chatId: placeholder('Telegram Chat ID'),
      message: expr(
        '⚠️ HUMAN APPROVAL REQUIRED\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'From: {{ $(\'Gmail Trigger\').item.json.from?.value?.[0]?.name ? ($(\'Gmail Trigger\').item.json.from.value[0].name + \' (\' + $(\'Gmail Trigger\').item.json.from.value[0].address + \')\') : ($(\'Gmail Trigger\').item.json.from?.value?.[0]?.address || $(\'Gmail Trigger\').item.json.from?.text?.replace(/</g, \'(\').replace(/>/g, \')\') || $(\'Gmail Trigger\').item.json.from) }}\n' +
        'Subject: {{ $(\'Gmail Trigger\').item.json.subject }}\n' +
        'Priority: {{ ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).priority }}\n' +
        'Reason: {{ ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).reason }}\n\n' +
        '📋 Summary:\n{{ ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).summary }}\n\n' +
        '✉️ AI Draft Response:\n{{ ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).draft_response }}\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'Tap \'Review & Decide\' below to Approve, Edit & Send, or Reject.'
      ),
      responseType: 'customForm',
      defineForm: 'fields',
      formFields: {
        values: [
          {
            fieldLabel: 'Decision',
            fieldName: 'decision',
            fieldType: 'radio',
            fieldOptions: {
              values: [
                { option: 'Approve' },
                { option: 'Edit and Send' },
                { option: 'Reject' }
              ]
            },
            defaultValue: 'Approve',
            requiredField: true
          },
          {
            fieldLabel: 'Final Response (Review or Edit)',
            fieldName: 'final_response',
            fieldType: 'textarea',
            defaultValue: expr('{{ $json.output?.draft_response || $json.draft_response }}'),
            requiredField: false
          },
          {
            fieldLabel: 'Notes / Reason (Optional)',
            fieldName: 'notes',
            fieldType: 'text',
            requiredField: false
          }
        ]
      },
      options: {
        responseFormTitle: 'Email Response Review & Approval',
        responseFormDescription: 'Review the incoming email and decide whether to approve the draft, edit before sending, or reject.',
        messageButtonLabel: 'Review & Decide',
        responseFormButtonLabel: 'Submit Decision',
        appendAttribution: false
      }
    },
    credentials: {
      telegramApi: newCredential('Telegram Bot')
    }
  },
  output: [
    {
      decision: 'Approve',
      final_response: 'Approved response text...',
      notes: ''
    }
  ]
});

/**
 * 9. Route Human Decision Switch Node
 * Case 0: Approve
 * Case 1: Edit and Send
 * Case 2 (fallback): Reject
 */
const routeDecision = switchCase({
  version: 3.4,
  config: {
    name: 'Route Human Decision',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            outputKey: 'Approve',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr('{{ $json.data?.decision || $json.data?.Decision || $json.decision || $json.Decision }}'),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'Approve'
                }
              ],
              combinator: 'and'
            }
          },
          {
            outputKey: 'Edit and Send',
            conditions: {
              options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
              conditions: [
                {
                  leftValue: expr('{{ $json.data?.decision || $json.data?.Decision || $json.decision || $json.Decision }}'),
                  operator: { type: 'string', operation: 'equals' },
                  rightValue: 'Edit and Send'
                }
              ],
              combinator: 'and'
            }
          }
        ]
      },
      options: {
        fallbackOutput: 'extra',
        renameFallbackOutput: 'Reject'
      }
    }
  },
  output: [
    {
      decision: 'Approve',
      final_response: 'Approved response content...',
      notes: ''
    }
  ]
});

/**
 * 10. Send Approved Reply (Gmail reply using AI draft)
 */
const sendApprovedReply = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Send Approved Reply',
    parameters: {
      resource: 'message',
      operation: 'reply',
      messageId: expr("{{ $('Gmail Trigger').item.json.id }}"),
      emailType: 'html',
      message: expr("{{ ($('Telegram Approval Request').item.json.data?.final_response || $('Telegram Approval Request').item.json.data?.['Final Response (Review or Edit)'] || ($('AI Email Analyzer').item.json.output || $('AI Email Analyzer').item.json).draft_response)?.replace(/\\n/g, '<br>') }}"),
      options: {
        appendAttribution: false
      }
    },
    credentials: {
      gmailOAuth2: newCredential('Gmail OAuth2')
    }
  },
  output: [
    {
      id: 'reply_app_001',
      threadId: 'thread_001'
    }
  ]
});

/**
 * 11. Notify Approved Reply Sent (Telegram confirmation)
 */
const notifyApprovedSent = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Notify Approved Reply Sent',
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: placeholder('Telegram Chat ID'),
      text: expr(
        '✅ <b>Approved Reply Sent</b>\n\n' +
        '<b>To:</b> {{ $(\'Gmail Trigger\').item.json.from?.value?.[0]?.name ? ($(\'Gmail Trigger\').item.json.from.value[0].name + \' (\' + $(\'Gmail Trigger\').item.json.from.value[0].address + \')\') : ($(\'Gmail Trigger\').item.json.from?.value?.[0]?.address || $(\'Gmail Trigger\').item.json.from?.text?.replace(/</g, \'(\').replace(/>/g, \')\') || $(\'Gmail Trigger\').item.json.from) }}\n' +
        '<b>Subject:</b> {{ $(\'Gmail Trigger\').item.json.subject }}\n' +
        '<b>Decision:</b> Approved\n\n' +
        '<b>Sent Response:</b>\n{{ $(\'Telegram Approval Request\').item.json.data?.final_response || $(\'Telegram Approval Request\').item.json.data?.[\'Final Response (Review or Edit)\'] || ($(\'AI Email Analyzer\').item.json.output || $(\'AI Email Analyzer\').item.json).draft_response }}'
      ),
      additionalFields: {
        parse_mode: 'HTML',
        appendAttribution: false
      }
    },
    credentials: {
      telegramApi: newCredential('Telegram Bot')
    }
  },
  output: [
    {
      ok: true
    }
  ]
});

/**
 * 12. Send Edited Reply (Gmail reply using human edited text)
 */
const sendEditedReply = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Send Edited Reply',
    parameters: {
      resource: 'message',
      operation: 'reply',
      messageId: expr("{{ $('Gmail Trigger').item.json.id }}"),
      emailType: 'html',
      message: expr("{{ ($('Telegram Approval Request').item.json.data?.final_response || $('Telegram Approval Request').item.json.data?.['Final Response (Review or Edit)'] || $('Telegram Approval Request').item.json.final_response)?.replace(/\\n/g, '<br>') }}"),
      options: {
        appendAttribution: false
      }
    },
    credentials: {
      gmailOAuth2: newCredential('Gmail OAuth2')
    }
  },
  output: [
    {
      id: 'reply_edit_001',
      threadId: 'thread_001'
    }
  ]
});

/**
 * 13. Notify Edited Reply Sent (Telegram confirmation)
 */
const notifyEditedSent = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Notify Edited Reply Sent',
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: placeholder('Telegram Chat ID'),
      text: expr(
        '✏️ <b>Edited Reply Sent</b>\n\n' +
        '<b>To:</b> {{ $(\'Gmail Trigger\').item.json.from?.value?.[0]?.name ? ($(\'Gmail Trigger\').item.json.from.value[0].name + \' (\' + $(\'Gmail Trigger\').item.json.from.value[0].address + \')\') : ($(\'Gmail Trigger\').item.json.from?.value?.[0]?.address || $(\'Gmail Trigger\').item.json.from?.text?.replace(/</g, \'(\').replace(/>/g, \')\') || $(\'Gmail Trigger\').item.json.from) }}\n' +
        '<b>Subject:</b> {{ $(\'Gmail Trigger\').item.json.subject }}\n' +
        '<b>Decision:</b> Edited and Sent\n\n' +
        '<b>Final Sent Message:</b>\n{{ $(\'Telegram Approval Request\').item.json.data?.final_response || $(\'Telegram Approval Request\').item.json.data?.[\'Final Response (Review or Edit)\'] || $(\'Telegram Approval Request\').item.json.final_response }}'
      ),
      additionalFields: {
        parse_mode: 'HTML',
        appendAttribution: false
      }
    },
    credentials: {
      telegramApi: newCredential('Telegram Bot')
    }
  },
  output: [
    {
      ok: true
    }
  ]
});

/**
 * 14. Notify Draft Rejected (Telegram notification)
 */
const notifyRejected = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Notify Draft Rejected',
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: placeholder('Telegram Chat ID'),
      text: expr(
        '❌ <b>Draft Rejected</b>\n\n' +
        '<b>From:</b> {{ $(\'Gmail Trigger\').item.json.from?.value?.[0]?.name ? ($(\'Gmail Trigger\').item.json.from.value[0].name + \' (\' + $(\'Gmail Trigger\').item.json.from.value[0].address + \')\') : ($(\'Gmail Trigger\').item.json.from?.value?.[0]?.address || $(\'Gmail Trigger\').item.json.from?.text?.replace(/</g, \'(\').replace(/>/g, \')\') || $(\'Gmail Trigger\').item.json.from) }}\n' +
        '<b>Subject:</b> {{ $(\'Gmail Trigger\').item.json.subject }}\n' +
        '<b>Decision:</b> Rejected\n' +
        '<b>Notes:</b> {{ $(\'Telegram Approval Request\').item.json.data?.notes || $(\'Telegram Approval Request\').item.json.data?.[\'Notes / Reason (Optional)\'] || $(\'Telegram Approval Request\').item.json.notes || "None provided" }}\n\n' +
        '<i>No email response was sent to the sender.</i>'
      ),
      additionalFields: {
        parse_mode: 'HTML',
        appendAttribution: false
      }
    },
    credentials: {
      telegramApi: newCredential('Telegram Bot')
    }
  },
  output: [
    {
      ok: true
    }
  ]
});

/**
 * 15. Log No Reply Node
 */
const logNoReply = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Log No Reply',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      assignments: {
        assignments: [
          {
            id: 'log-status',
            name: 'status',
            value: 'Ignored - NO_REPLY',
            type: 'string'
          },
          {
            id: 'log-reason',
            name: 'reason',
            value: expr("{{ ($('AI Email Analyzer').item.json.output || $('AI Email Analyzer').item.json).reason }}"),
            type: 'string'
          }
        ]
      }
    }
  },
  output: [
    {
      status: 'Ignored - NO_REPLY',
      reason: 'Marketing newsletter'
    }
  ]
});

/**
 * Workflow Composition & DAG Definition
 */
export default workflow('ai-email-automation', 'AI Email Triage & Telegram Approval Automation')
  .add(gmailTrigger)
  .to(emailAnalyzer)
  .to(routeClassification
    .onCase(0, sendAutoReply.to(notifyAutoReplied))
    .onCase(1, telegramApprovalRequest.to(routeDecision
      .onCase(0, sendApprovedReply.to(notifyApprovedSent))
      .onCase(1, sendEditedReply.to(notifyEditedSent))
      .onCase(2, notifyRejected)))
    .onCase(2, logNoReply));
