comp_class_scores = {
    'Attack':	[4,	3,	3,	5,	2,	2,	2,	2,	1,	4,	4,	4,	5,	3,	5,	3,	5,	1,	1,	1],
    'Catch':	[5,	1,	5,	2,	5,	2,	3,	2,	3,	3,	3,	5,	2,	4,	4,	4,	4,	1,	1,	1],
    'Protect':	[1,	5,	4,	4,	1,	3,	3,	3,	1,	4,	4,	2,	2,	2,	2,	3,	1,	5,	5,	5],
    'Siege':	[3,	4,	3,	4,	1,	4,	5,	5,	1,	1,	3,	2,	2,	2,	2,	3,	1,	4,	5,	5],
    'Split':	[3,	3,	4,	3,	5,	5,	3,	4,	5,	2,	2,	2,	1,	1,	1,	4,	1,	2,	4,	5],
};

attribute_order = [
    'Bur. Dam.', 'DPS Dam.', 'ST Dam.', 'AOE Dam.', 'Skirmishing', 'Wave Clear', 'Poke', 'Siege', 'Split Pushing', 'Mit. Tough.', 'Sus. Tough.', 'ST CC', 'AOE CC', 'CC Range', 'CC Impact', 'Repo. Mob.', 'Eng. Mob.', 'Utility', 'Zone Cont.', 'Peel'
]

module.exports = {
    comp_class_scores: comp_class_scores,
    attribute_order: attribute_order
}