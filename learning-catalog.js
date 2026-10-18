/* Parent-facing topics. IDs stay stable so saved practice routes survive updates. */
(() => {
  const modules = [
    ['arithmetic','＋−','加减与数量','接来、送走、补齐、分合与比较'],
    ['multiplication','×÷','乘法与除法','等量分组、平均分和余数'],
    ['numbers','123','数与位值','计数单位、组成数和负数'],
    ['shapes','△','图形与角','辨认图形、认识角'],
    ['patterns','↗','规律探索','找出重复或递增的规律'],
    ['time','◷','时间与时钟','拨一拨，认识时与分'],
    ['money','¥','人民币','用元、角配出需要的钱'],
    ['measurement','▦','测量与空间','长度、周长、面积和体积'],
    ['fractions','½','分数·小数·百分数','用等分的图形表示数量'],
    ['position','⌖','位置与对称','找位置，补出对称图案'],
    ['statistics','▥','数据与统计','读取数量记录，制作条形图'],
    ['relations','=','等式与比','保持平衡，按比例调配']
  ].map(([id,icon,name,description])=>({id,icon,name,description}));
  const moduleFor = level => level.moduleId || (level.grade===2?'multiplication':'arithmetic');
  const topicFor = level => level.challengeType==='knowledge'?level.family:level.mode==='math'?(level.op==='+'?'plus':'minus'):level.challengeType;
  window.DinoLearningCatalog = {modules,moduleFor,topicFor};
})();
