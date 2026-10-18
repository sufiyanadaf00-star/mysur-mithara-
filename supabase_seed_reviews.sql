-- MYSURU MITHRA: SEED REVIEWS
-- Adds 55 sample 4- and 5-star reviews. Paste all of this into the Supabase SQL Editor and click Run.
-- Running it again does not add duplicates.
-- To REMOVE exactly these reviews later, change `false as remove_seed` to `true` and run it again.

with settings as (select false as remove_seed),
seed(name, dish, rating, review, minutes_ago) as (values
  ('Ananya Gowda',      'Mysuru Avalakki', 5, 'tastes exactly like my ajji''s avalakki. lemon and curry leaves on point',          4210),
  ('Pavan Hegde',       'Rose Mithaas',    4, 'Rose flavour is nice and not too strong. Little bigger piece next time pls',        9875),
  ('Sinchana Rao',      'Rose Mithaas',    5, 'melts in the mouth 🌹 not too sweet also, perfect after lunch',                      310),
  ('Karthik Bhat',      'Mysuru Avalakki', 5, 'sakkath taste guru. peanuts were crunchy and fresh',                                7432),
  ('Shreya Kulkarni',   'Mysuru Avalakki', 4, 'Soft and tasty, just needed a little more lemon for me',                            15210),
  ('Nikhil Patil',      'Rose Mithaas',    5, 'got the rose one twice in a row, no regrets 😅',                                     2890),
  ('Tejas Urs',         'Mysuru Avalakki', 5, 'ekdum mast avalakki. came with friends between classes, all of us liked it',        18640),
  ('Varsha Nayak',      'Rose Mithaas',    4, 'Lovely rose smell. A bit too sweet for me, maybe reduce the sugar slightly',        5560),
  ('Prajwal Acharya',   'Mysuru Avalakki', 5, 'super aagide. price is fair for the quantity also',                                 11025),
  ('Deeksha Shetty',    'Rose Mithaas',    5, 'Soft, rosy and not overly sweet. My friend Nisha loved it too',                     640),
  ('Manoj Gowda',       'Mysuru Avalakki', 4, 'good taste, could add a few more peanuts',                                          13380),
  ('Bhoomika Hegde',    'Rose Mithaas',    5, 'this rose mithaas is too good yaar, coming back tomorrow',                          3745),
  ('Sumanth Rao',       'Mysuru Avalakki', 5, 'Proper Mysuru style avalakki. Light and filling before the 10am class',             19870),
  ('Spoorthi Bhat',     'Rose Mithaas',    4, 'Taste is lovely. Would be even better slightly chilled',                            8120),
  ('Chethan Nayak',     'Mysuru Avalakki', 5, 'curry leaves and lemon smell hits first, then the peanuts. very nice',              2215),
  ('Kavya Shenoy',      'Rose Mithaas',    5, 'rose flavour is subtle, not like those artificial ones. really liked it 💗',         16455),
  ('Rohith Kamath',     'Mysuru Avalakki', 4, 'Nice and soft. Bit more salt next time and it''s perfect',                          6730),
  ('Apoorva Joshi',     'Rose Mithaas',    5, 'just melts away, sweetness is perfectly balanced',                                  95),
  ('Yashwanth Gowda',   'Mysuru Avalakki', 5, 'avalakki was fresh and hot, worth every rupee',                                     12560),
  ('Harshitha Urs',     'Rose Mithaas',    4, 'Really nice. The portion felt a little small though',                               4475),
  ('Akshay Kulkarni',   'Mysuru Avalakki', 5, 'bro this avalakki is better than our canteen one 🔥',                                17220),
  ('Nandini Patil',     'Mysuru Avalakki', 4, 'liked the softness. a little green chilli would make it even better',               9310),
  ('Vinay Hegde',       'Rose Mithaas',    5, 'Rose mithaas sakkath aagide. Not too sweet, just right',                            1760),
  ('Sahana Murthy',     'Mysuru Avalakki', 5, 'Simple and tasty, reminded me of breakfast at home',                                14890),
  ('Abhishek Bhat',     'Rose Mithaas',    4, 'Good one. Rose taste could be a little stronger',                                   7045),
  ('Keerthana Nayak',   'Mysuru Avalakki', 5, 'lemon is just right, not too sour. loved it',                                       3120),
  ('Shashank Acharya',  'Rose Mithaas',    5, 'took one for my roommate also, now he''s asking where I got it',                    10560),
  ('Meghana Rao',       'Rose Mithaas',    5, 'so soft and the rose smell is lovely 🌸',                                            20010),
  ('Gagan Shetty',      'Mysuru Avalakki', 4, 'tasty and filling. would be nice if it came a bit hotter',                          5890),
  ('Lohith Kumar',      'Mysuru Avalakki', 5, 'crunchy peanuts, soft avalakki, good lemon. full marks',                            15780),
  ('Chaitra Hebbar',    'Rose Mithaas',    4, 'Very nice taste. Bit sticky to hold, maybe give a small paper cup',                 2560),
  ('Prathik Poojary',   'Rose Mithaas',    5, 'best rose sweet I''ve had in a while, seriously',                                   8890),
  ('Anusha Kamath',     'Mysuru Avalakki', 5, 'Light, not oily at all. Perfect for a quick bite between labs',                     12090),
  ('Sharath Gowda',     'Mysuru Avalakki', 4, 'good taste, a little more curry leaves would be nice',                              18320),
  ('Divya Bhandary',    'Rose Mithaas',    5, 'Rose flavour is so refreshing. Not heavy at all',                                   4890),
  ('Nithin Shetty',     'Mysuru Avalakki', 5, 'ekdum fresh. me and my gang finished it in 2 mins',                                 6215),
  ('Sneha Hiremath',    'Rose Mithaas',    4, 'nice texture. maybe try a pista topping sometime',                                  13560),
  ('Kushal Urs',        'Mysuru Avalakki', 5, 'tasted homemade, not like the packet poha stuff. super',                            19210),
  ('Priya Subramanian', 'Mysuru Avalakki', 5, 'we call it aval at home, this one is softer than mine honestly 😄',                  7790),
  ('Vignesh Raman',     'Rose Mithaas',    4, 'good sweet. would be great if you also had a combo with the avalakki',              11640),
  ('Harika Reddy',      'Rose Mithaas',    5, 'chala bagundi. rose flavour is very nice and soft',                                 1480),
  ('Vamsi Naidu',       'Mysuru Avalakki', 4, 'Nice taste. Little spicier would suit me better',                                   16980),
  ('Aswathy Nair',      'Rose Mithaas',    5, 'the rose taste is so gentle, melts in mouth. adipoli',                              9620),
  ('Gokul Pillai',      'Mysuru Avalakki', 4, 'curry leaves nicely fried, peanuts crunchy. would love a small pickle on the side', 3390),
  ('Omkar Deshpande',   'Mysuru Avalakki', 4, 'chan aahe. a little sev on top would be a nice touch',                              14230),
  ('Rutuja Jadhav',     'Rose Mithaas',    5, 'Perfectly sweet, not overloaded with sugar. would buy again',                       5240),
  ('Aditya Sharma',     'Mysuru Avalakki', 5, 'bhai avalakki ekdum mast hai, coming tomorrow also',                                10890),
  ('Ishita Agarwal',    'Rose Mithaas',    4, 'tastes lovely 😋 would be great with a cup of chai alongside',                       17650),
  ('Gurleen Kaur',      'Rose Mithaas',    5, 'first time trying rose mithaas and now I''m hooked',                                760),
  ('Ayesha Banu',       'Mysuru Avalakki', 4, 'soft and tasty. some fresh coriander on top would be nice',                         8460),
  ('Arshad Pasha',      'Mysuru Avalakki', 5, 'best avalakki near campus, no doubt. price also reasonable',                        13910),
  ('Joel D''Souza',     'Rose Mithaas',    4, 'quite nice, rose flavour is good. texture a bit dense, could be softer',            2040),
  ('Riya Fernandes',    'Rose Mithaas',    5, 'my friend dragged me here and I''m glad she did. rose mithaas is lovely',           18980),
  ('Sayan Chatterjee',  'Mysuru Avalakki', 4, 'not usually a poha guy but this was good. bit more masala and I''d be sold',        6510),
  ('Zoya Fathima',      'Rose Mithaas',    4, 'delicious 🌹 the rose syrup could be a little thicker',                              11380)
),
removed as (
  delete from public.feedback f
  using seed s, settings
  where settings.remove_seed
    and f.name = s.name and f.dish = s.dish and f.rating = s.rating and f.review = s.review
  returning f.id
)
insert into public.feedback (name, dish, rating, review, created_at)
select s.name, s.dish, s.rating, s.review, now() - make_interval(mins => s.minutes_ago)
from seed s, settings
where not settings.remove_seed
  and not exists (
    select 1 from public.feedback f
    where f.name = s.name and f.dish = s.dish and f.review = s.review
  );
