// Short-answer quiz dataset
// Each item:
// - id: unique id
// - prompt: question text
// - checks: { all?: [keywords], any?: [keywords] }
//   The answer must contain all of `all` and at least one of `any` (case-insensitive, substring match)

const items = [
  {
    id: 1,
    prompt: 'อธิบายความต่างของ Market Order กับ Limit Order แบบสั้นๆ',
    checks: {
      all: ['limit'],
      any: ['market', 'ราคาตลาด', 'ทันที', 'กำหนดราคา'],
    },
    hint: 'Market = สั่งทันทีตามราคาตลาด, Limit = กำหนดราคาที่ต้องการ',
  },
  {
    id: 2,
    prompt: 'Stop Loss คืออะไร และใช้เพื่ออะไร?',
    checks: {
      all: ['หยุด', 'ขาดทุน'],
      any: ['ความเสี่ยง', 'ตัดขาดทุน', 'ป้องกัน', 'กำหนดราคา'],
    },
    hint: 'ตั้งจุดตัดขาดทุนเพื่อจำกัดความเสี่ยง',
  },
  {
    id: 3,
    prompt: 'Risk/Reward 1:2 แปลว่าอะไรในเชิงกลยุทธ์?',
    checks: {
      all: ['1:2'],
      any: ['ความเสี่ยง', 'ผลตอบแทน', 'เสี่ยง', 'คุ้มค่า'],
    },
    hint: 'ยอมเสี่ยง 1 ส่วนเพื่อหวังผลตอบแทน 2 ส่วน',
  },
  {
    id: 4,
    prompt: 'ขนาดพอร์ต 100,000 บาท ควรเสี่ยงต่อครั้งไม่เกินกี่เปอร์เซ็นต์ (แนวอนุรักษ์นิยม)?',
    checks: {
      any: ['1%', '2%', '1-2%','1 %','2 %'],
    },
    hint: 'นิยม 1-2% ต่อครั้ง',
  },
  {
    id: 5,
    prompt: 'สิ่งใดสำคัญกว่ากันระหว่าง Win Rate กับ Expectancy? เพราะอะไร (ตอบสั้นๆ)',
    checks: {
      any: ['expectancy', 'คาดหวัง', 'ผลคาดหวัง'],
    },
    hint: 'Expectancy สำคัญกว่าเพราะสะท้อนกำไรคาดหวังสุทธิ',
  },
];

export default items;
