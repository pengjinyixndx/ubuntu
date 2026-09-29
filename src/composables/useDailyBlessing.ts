import { getTogetherDays } from './useTogether'

export interface Blessing {
  /** 祝福正文（诗句或名言） */
  text: string
  /** 出处 */
  source: string
}

/**
 * 每日祝福：以「在一起第几天」为序号轮换，每天自动换一句。
 * 以中国古典爱情诗词为主，点缀几句关于相守的名言。
 */
export const BLESSINGS: Blessing[] = [
  { text: '执子之手，与子偕老。', source: '《诗经·邶风·击鼓》' },
  { text: '琴瑟在御，莫不静好。', source: '《诗经·郑风·女曰鸡鸣》' },
  { text: '一日不见，如三秋兮。', source: '《诗经·王风·采葛》' },
  { text: '投我以木桃，报之以琼瑶。', source: '《诗经·卫风·木瓜》' },
  { text: '青青子衿，悠悠我心。', source: '《诗经·郑风·子衿》' },
  { text: '所谓伊人，在水一方。', source: '《诗经·秦风·蒹葭》' },
  { text: '窈窕淑女，君子好逑。', source: '《诗经·周南·关雎》' },
  { text: '愿得一心人，白首不相离。', source: '卓文君《白头吟》' },
  { text: '结发为夫妻，恩爱两不疑。', source: '苏武《留别妻》' },
  { text: '盈盈一水间，脉脉不得语。', source: '《古诗十九首》' },
  { text: '山无陵，天地合，乃敢与君绝。', source: '汉乐府《上邪》' },
  { text: '南风知我意，吹梦到西洲。', source: '南朝乐府《西洲曲》' },
  { text: '山有木兮木有枝，心悦君兮君不知。', source: '《越人歌》' },
  { text: '身无彩凤双飞翼，心有灵犀一点通。', source: '李商隐《无题》' },
  { text: '何当共剪西窗烛，却话巴山夜雨时。', source: '李商隐《夜雨寄北》' },
  { text: '春蚕到死丝方尽，蜡炬成灰泪始干。', source: '李商隐《无题》' },
  { text: '曾经沧海难为水，除却巫山不是云。', source: '元稹《离思》' },
  { text: '取次花丛懒回顾，半缘修道半缘君。', source: '元稹《离思》' },
  { text: '在天愿作比翼鸟，在地愿为连理枝。', source: '白居易《长恨歌》' },
  { text: '两情若是久长时，又岂在朝朝暮暮。', source: '秦观《鹊桥仙》' },
  { text: '金风玉露一相逢，便胜却人间无数。', source: '秦观《鹊桥仙》' },
  { text: '柔情似水，佳期如梦。', source: '秦观《鹊桥仙》' },
  { text: '只愿君心似我心，定不负相思意。', source: '李之仪《卜算子》' },
  { text: '衣带渐宽终不悔，为伊消得人憔悴。', source: '柳永《蝶恋花》' },
  { text: '天涯地角有穷时，只有相思无尽处。', source: '晏殊《玉楼春》' },
  { text: '众里寻他千百度，蓦然回首，那人却在灯火阑珊处。', source: '辛弃疾《青玉案》' },
  { text: '愿为西南风，长逝入君怀。', source: '曹植《七哀诗》' },
  { text: '君当作磐石，妾当作蒲苇；蒲苇纫如丝，磐石无转移。', source: '《孔雀东南飞》' },
  { text: '举手长劳劳，二情同依依。', source: '《孔雀东南飞》' },
  { text: '此时相望不相闻，愿逐月华流照君。', source: '张若虚《春江花月夜》' },
  { text: '相思相见知何日，此时此夜难为情。', source: '李白《三五七言》' },
  { text: '入我相思门，知我相思苦。', source: '李白《三五七言》' },
  { text: '被酒莫惊春睡重，赌书消得泼茶香。', source: '纳兰性德《浣溪沙》' },
  { text: '爱，不是彼此凝视，而是一起注视同一个方向。', source: '圣埃克苏佩里' },
  { text: '生命中最值得紧握的，是彼此。', source: '奥黛丽·赫本' },
  { text: '哪里有爱，哪里就有生命。', source: '甘地' },
  { text: '眼睛为她下着雨，心却为她打着伞，这就是爱情。', source: '泰戈尔' }
]

/** 取当天对应的祝福（同一天内保持不变，次日自动更换） */
export function getDailyBlessing(): Blessing {
  const day = getTogetherDays()
  const index = (day - 1) % BLESSINGS.length
  return BLESSINGS[index]!
}
