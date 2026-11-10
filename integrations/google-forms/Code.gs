// Run setupTscConsultationForm from the Apps Script editor after configuring Script Properties.
const TSC_FIELDS = [
  { key: 'p_code', label: '會員驗證碼', type: 'text', required: true, max: 72 },
  { key: 'p_category', label: '諮詢類別', options: ['商業經營','銷售漏斗','資源媒合','行銷品牌','其他'] },
  { key: 'p_subject', label: '諮詢主題', type: 'text', required: true, max: 150 },
  { key: 'p_description', label: '現況、卡關及希望達成的結果', type: 'paragraph', required: true, max: 3000 },
  { key: 'p_priority', label: '優先程度', options: ['一般','重要','緊急'] },
  { key: 'p_method', label: '希望諮詢方式', options: ['不拘','電話','視訊','實體'] },
];

function setupTscConsultationForm() {
  const config = tscProperties_();
  tscConnection_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = config.getProperty('TSC_FORM_ID');
    const form = existing ? FormApp.openById(existing) : FormApp.create('TSC VIP｜會員諮詢單', false);
    if (!existing) config.setProperty('TSC_FORM_ID', form.getId());
    form.setDescription('請從會員後台開啟專屬填寫連結，保留預填的會員驗證碼。請描述你希望諮詢的情況與目標。')
      .setConfirmationMessage('表單已收到。TSC 會依諮詢內容安排後續處理。')
      .setAllowResponseEdits(false)
      .setPublishingSummary(false);
    const itemIds = {};
    for (const field of TSC_FIELDS) {
      const items = form.getItems().filter(item => item.getTitle() === field.label);
      if (items.length > 1) throw new Error('有重複的表單題目，請先確認表單設定。');
      let item;
      if (field.options) {
        item = items.length ? items[0].asMultipleChoiceItem() : form.addMultipleChoiceItem();
        item.setTitle(field.label).setChoiceValues(field.options).setRequired(true);
      } else if (field.type === 'paragraph') {
        item = items.length ? items[0].asParagraphTextItem() : form.addParagraphTextItem();
        item.setTitle(field.label).setRequired(field.required)
          .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(field.max).build());
      } else {
        item = items.length ? items[0].asTextItem() : form.addTextItem();
        const validation = FormApp.createTextValidation();
        if (field.key === 'p_code') validation.requireTextMatchesPattern('^[0-9a-f-]{72}$');
        else validation.requireTextLengthLessThanOrEqualTo(field.max);
        item.setTitle(field.label).setRequired(field.required).setValidation(validation.build());
      }
      itemIds[field.key] = item.getId();
    }
    config.setProperty('TSC_ITEM_IDS', JSON.stringify(itemIds));
    if (!ScriptApp.getProjectTriggers().some(trigger =>
      trigger.getHandlerFunction() === 'receiveTscConsultation' && trigger.getTriggerSourceId() === form.getId())) {
      ScriptApp.newTrigger('receiveTscConsultation').forForm(form).onFormSubmit().create();
    }
    form.setPublished(true);
    form.setAcceptingResponses(true);
    const codeField = form.getItemById(itemIds.p_code).asTextItem();
    // Derive the prefill query key from Google Forms instead of assuming the item ID matches it.
    const sample = '00000000-0000-0000-0000-000000000000'.repeat(2);
    const template = form.createResponse().withItemResponse(codeField.createResponse(sample))
      .toPrefilledUrl().replace(sample, 'TSC_CODE_PLACEHOLDER');
    if (!template.includes('TSC_CODE_PLACEHOLDER')) throw new Error('Google 未回傳可預填的表單網址。');
    console.log('NEXT_PUBLIC_GOOGLE_FORM_TEMPLATE=' + template);
    console.log('表單管理網址：' + form.getEditUrl());
  } finally {
    lock.releaseLock();
  }
}

function receiveTscConsultation(event) {
  if (!event || !event.response || event.source.getId() !== tscProperties_().getProperty('TSC_FORM_ID')) {
    throw new Error('表單來源不符。');
  }
  tscSend_(event.response);
}

// Replay recent submissions after an outage. The database deduplicates repeat deliveries.
function replayRecentTscConsultations() {
  const id = tscProperties_().getProperty('TSC_FORM_ID');
  if (!id) throw new Error('請先建立表單。');
  const responses = FormApp.openById(id).getResponses(new Date(Date.now() - 24 * 60 * 60 * 1000));
  let failed = 0;
  for (const response of responses) {
    try { tscSend_(response); } catch (_) { failed += 1; }
  }
  console.log('共處理 ' + responses.length + ' 筆，未同步 ' + failed + ' 筆。');
}

function tscSend_(response) {
  const { url, key } = tscConnection_();
  const ids = JSON.parse(tscProperties_().getProperty('TSC_ITEM_IDS') || '{}');
  const answers = new Map(response.getItemResponses().map(item => [item.getItem().getId(), item.getResponse()]));
  const payload = { p_response_id: response.getId() };
  for (const field of TSC_FIELDS) payload[field.key] = String(answers.get(ids[field.key]) || '').trim();
  const result = UrlFetchApp.fetch(url + '/rest/v1/rpc/vip_receive_google_form', {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = result.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('諮詢同步失敗（HTTP ' + status + '）。');
}

function tscProperties_() {
  return PropertiesService.getScriptProperties();
}

function tscConnection_() {
  const config = tscProperties_();
  const url = (config.getProperty('TSC_SUPABASE_URL') || '').replace(/\/$/, '');
  const key = config.getProperty('TSC_SUPABASE_ANON_KEY');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) throw new Error('請在指令碼屬性設定 Supabase URL 與 publishable／anon key。');
  return { url, key };
}
