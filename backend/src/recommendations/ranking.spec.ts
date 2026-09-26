import { Candidate, cityKey, rank } from './ranking';
const hotel=(id:string,city:string,amenities:string[]=[],price=100):Candidate=>({id,name:id,city,amenities,price,stars:4,rating:0,reviews:0});
describe('content recommendations',()=>{
  it('diversifies cold start without fabricated reviews',()=>{
    const input=[hotel('a','Hà Nội'),hotel('b','Hà Nội'),hotel('c','Đà Nẵng'),hotel('d','Phú Quốc')];
    expect(new Set(rank(input,[]).slice(0,3).map(x=>x.hotel.city)).size).toBe(3);
    expect(rank([...input].reverse(),[]).map(x=>x.hotel.id)).toEqual(rank(input,[]).map(x=>x.hotel.id));
  });
  it('promotes similar city, amenities and budget from real history',()=>{
    const liked=hotel('viewed','Đà Nẵng',['Pool','Spa'],120);
    const near=hotel('near','Đà Nẵng',['Pool','Spa'],130);
    const far=hotel('far','Hà Nội',['Gym'],500);
    const ranked=rank([far,near],[{hotel:liked,weight:1}]);
    expect(ranked[0].hotel.id).toBe('near');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
  it('normalizes destination aliases and accents',()=>{
    expect(cityKey('TP. Hồ Chí Minh')).toBe(cityKey('TP HCM'));
    expect(cityKey('Da Nang')).toBe(cityKey('Đà Nẵng'));
  });
  it('does not let one perfect review beat established good ratings',()=>{
    const first={...hotel('first','Hà Nội'),rating:5,reviews:1};
    const established={...hotel('established','Hà Nội'),rating:4.6,reviews:100};
    expect(rank([first,established],[])[0].hotel.id).toBe('established');
  });
  it('handles missing prices and unknown stars without NaN or lost candidates',()=>{
    const h={...hotel('a','Phú Quốc'),price:undefined,stars:0};
    const result=rank([h],[{hotel:h,weight:1}]);
    expect(result).toHaveLength(1);expect(Number.isFinite(result[0].score)).toBe(true);
  });
});
