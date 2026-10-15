"""Run with Python 3 + NumPy from this directory. Reads the delivered V1 files.

Checks integer weights, exact means, small-tier loss probabilities, phase
boundaries, increasing risk and newcomer improvements. It does not modify files.
"""
import json
from pathlib import Path
import numpy as np

root=Path(__file__).resolve().parent
c=json.loads((root/'GAME_ECONOMY_V1.json').read_text(encoding='utf-8'))
report=json.loads((root/'GAME_ECONOMY_VALIDATION.json').read_text(encoding='utf-8'))
weights=np.array(c['ordinary']['grade_weights'],dtype=np.int64)
scale=c['ordinary']['grade_weight_denominator']
p=weights/scale
values=np.array(c['ordinary']['value_slots'],dtype=np.int64)
means=values.mean(axis=1)
assert np.all(weights.sum(axis=1)==scale)
assert np.all(weights>=0)
for g in range(7):
 lo,hi=10**(g+2),10**(g+3)-1
 assert np.all((values[g]>=lo)&(values[g]<=hi))
 assert int(values[g].sum())*2==20*(lo+hi)
for tier in range(7):
 allowed=list(range(4)) if tier==0 else list(range(max(0,tier-2),7))
 assert all(weights[tier,g]>0 for g in allowed)
 assert all(weights[tier,g]==0 for g in range(7) if g not in allowed)
 b=c['boxes'][tier];r=report['economy'][tier]
 assert b['item_count']==(1 if tier==0 else tier+2)
 ex=b['ex_numerator_per_million']/1_000_000
 mu=float(p[tier]@means)
 assert abs(mu*b['item_count']-r['standard']['ordinary_expected'])<.01
 full=b['item_count']*((1-ex)*mu+ex*c['ex']['values'][0])
 assert abs(full-r['standard']['full_expected'])<.01
 if tier:
  assert r['newcomer_1']['final_loss']<r['newcomer_2']['final_loss']<r['standard']['final_loss']
  assert r['newcomer_1']['ordinary_rtp']>r['newcomer_2']['ordinary_rtp']>r['standard']['ordinary_rtp']
assert c['ex']['conditional_weights']==[2,2,1]
assert all(v==means[6]*50 for v in c['ex']['values'])
assert all(report['economy'][t]['standard']['final_loss']<report['economy'][t+1]['standard']['final_loss'] for t in range(1,6))

def delta(open_index):
 for phase in c['newcomer']['phases']:
  if phase['paid_open_index_start']<=open_index<=phase['paid_open_index_end']:
   return phase['shift_lowest_to_next']
 return 0
assert [delta(i) for i in [1,200,201,300,301]]==[.08,.08,.04,.04,0]

# All non-grade-1 outcomes win in tier 1. In tier 2, only zero or one
# grade-2 item can lose; higher grades and two grade-2 items always win.
v1,v2=values[0],values[1]
sum3=(v1[:,None,None]+v1[None,:,None]+v1[None,None,:]).reshape(-1)
ordinary_loss1=p[1,0]**3*float((sum3<1500).mean())
ordinary_loss2=p[2,0]**4+4*p[2,1]*p[2,0]**3*float((sum3[:,None]+v2[None,:]<6000).mean())
exact=[]
for tier,loss in [(1,ordinary_loss1),(2,ordinary_loss2)]:
 r=report['economy'][tier]
 assert abs(loss-r['standard']['ordinary_loss'])<4*(loss*(1-loss)/1_000_000)**.5
 final=loss*(1-r['ex_per_item'])**r['count']
 exact.append({'tier':tier,'exact_ordinary_loss':loss,'exact_final_loss':final})
for run in report['progression']:
 assert all(m['completion_rate']==1 for m in run['milestones'])
print(json.dumps({'status':'passed','exact_small_tier_loss':exact,'checked':'Weights, grade ranges, 140 prices, EX values, expected returns, risk ordering, newcomer stages and 10,000 simulated progression runs.'},ensure_ascii=False,indent=2))
