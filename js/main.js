$(document).ready(function() { 
    const PSV = new TSV.TSV.Parser('\t');
    var champion_data;
    var math = false;
    var compChart;
    var teams = [
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}},
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}}
    ];

    var comfort = [], meta = [{'Top': {}, 'Jungle': {}, 'Mid': {}, 'ADC': {}, 'Support': {}}, {'Top': {}, 'Jungle': {}, 'Mid': {}, 'ADC': {}, 'Support': {}}];
    var your_champ_data_filter = [{}, {}];

    function chance(team1, team2) {
        const chancesCoW = [
            /*      A  C  P Si Sp*/
            /* A*/[0, 1, 2, -2, -1],
            /* C*/[-1, 0, 1, 2, -2],
            /* P*/[-2, -1, 0, 1, 2],
            /*Si*/[2, -2, -1, 0, 1],
            /*Sp*/[1, 2, -2, -1, 0],
        ];
        const chancesRandomonium = [
            /*        A    C    P   Si   Sp*/
            /* A*/[0.00, 0.62, 0.62, 0.19, 0.40],
            /* C*/[0.38, 0.00, 0.50, 0.72, 0.17],
            /* P*/[0.38, 0.50, 0.00, 0.81, 0.00],
            /*Si*/[0.81, 0.28, 0.19, 0.00, 0.75],
            /*Sp*/[0.60, 0.83, 1.00, 0.25, 0.00],
        ];
        const comp_index = {
            "CompScoreAttack": 0,
            "CompScoreCatch": 1,
            "CompScoreProtect": 2,
            "CompScoreSiege": 3,
            "CompScoreSplit": 4,
        };
        let indexBlue = comp_index[team1[0]];
        let indexRed = comp_index[team2[0]];
        /*
        2 = blue is hard counter of  red
        1 = blue is soft counter of  red
        0 = blue is same    type as  red
        -1 =  red is soft counter of blue
        -2 =  red is hard counter of blue
        */
        let answer1 = chancesCoW[indexBlue][indexRed];
        if (answer1 == 0) {
            if (team1[1] == team2[1])
                return 0.5;
            return (team1[1] > team2[1]) ? 1 : 0;
        }
        else 
        {
            return chancesRandomonium[indexBlue][indexRed];
        }
        if (answer1 == 1) {
            return (team1[1] >= team2[1]) ? 0.875 : 0.625;
        }
        if (answer1 == -1) {
            return (team1[1] <= team2[1]) ? 0.125 : 0.375;
        }
        if (answer1 == 2) {
            return 1;
        }
        if (answer1 == -2) {
            return 0;
        }
    }

    function determineWinner() {
        const comp_team1 = Object.values(teams[0]).filter((x) => x['Champion'].length != 0);
        const comp_team2 = Object.values(teams[1]).filter((x) => x['Champion'].length != 0);
        const data1 = Object.entries(scoreChampionInComp(undefined, comp_team1, 'Base 1')).sort((a, b) => b[1]-a[1]).map(a => [a[0], a[1] / comp_team1.length]).slice(0, 3);
        const data2 = Object.entries(scoreChampionInComp(undefined, comp_team2, 'Base 1')).sort((a, b) => b[1]-a[1]).map(a => [a[0], a[1] / comp_team2.length]).slice(0, 3);

        console.log(data1, data2);
        
        let team_status = [];
        let winner_team = 1;
        let calc_chances = 0;
        const eps = 0.0559375;

        if (comp_team1.length == 0 && comp_team2.length == 0) {
            calc_chances = 0.5;
            winner_team = -1;
        }
        else if (comp_team1.length == 0) {
            calc_chances = 0;
            winner_team = 2;
        }
        else if (comp_team2.length == 0) {
            calc_chances = 1;
            winner_team = 1;
        }
        else {
            for(let i = 0 ; i < 3 ; i += 1) {
                for(let j = 0 ; j < 3 ; j += 1) {
                    calc_chances += chance(data1[i], data2[j]);
                }
            }

            calc_chances /= 9;

            console.log(calc_chances);

            winner_team = (calc_chances < 0.5 - eps) ? 2 :
                            (calc_chances > 0.5 + eps) ? 1 :
                            -1;
        }

        $('#eps').text('eps = ' + Math.round(eps*10000000)/100000 + '%');
        
        console.log(winner_team);

        if (winner_team != -1) {
            team_status[winner_team - 1] = 'winner';
            team_status[2 - winner_team] = 'loser';
        }
        else {
            team_status[0] = team_status[1] = '50';
        }

        const roles = Object.keys(teams[0]);
        for(let i = 0 ; i < 2 ; i += 1) {
            for(const role of roles) {
                $(`td:has(#team${i+1}_${role}_champion)`).removeClass("winner loser").addClass(team_status[i]);
            }
            $(`#team${i+1}_status`).removeClass("winner loser").addClass(team_status[i]);
            const percentage = (i == 0) ? calc_chances : 1 - calc_chances;
            $(`#team${i+1}_status`).text(team_status[i] + " / " + (Math.round(percentage*1000)/10) + '%').css('text-transform','capitalize');
        }
    }

    function expandComps(comp, type) {
        const standardDeviation = (array) => {
            const n = array.length - 1;
            const mean = array.reduce((a, b) => a + b) / array.length;
            return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
        };
        const prefix = 'CompScore';
        const compProperties = ['Attack', 'Catch', 'Protect', 'Siege', 'Split'];
        let scores = {};
        if (type === undefined)
            type = $('#comp_type').val();
        for (let i = 0 ; i < compProperties.length ; i += 1) {
            if (type == compProperties[i] || type == 'Base 1') {
                scores[prefix + compProperties[i]] = comp[prefix + compProperties[i]];
            }
        }
        if (type[type.length - 1] == '2') {
            for (let i = 0 ; i < compProperties.length ; i += 1) {
                for (let j = i + 1 ; j < compProperties.length ; j += 1) {
                    if (type == 'Ultimate 2') {
                        scores[prefix + compProperties[i] + '+' + compProperties[j]] = 3000 - standardDeviation([comp[prefix + compProperties[i]],
                                                                                                            comp[prefix + compProperties[j]]]);
                    }
                    if (type == 'Base 2') {
                        scores[prefix + compProperties[i] + '+' + compProperties[j]] = Math.min(comp[prefix + compProperties[i]],
                                                                                            comp[prefix + compProperties[j]]);
                    }
                }
            }
        }
        if (type[type.length - 1] == '3') {
            for (let i = 0 ; i < compProperties.length ; i += 1) {
                for (let j = i + 1 ; j < compProperties.length ; j += 1) {
                    for (let k = j + 1 ; k < compProperties.length ; k += 1) {
                        if (type == 'Ultimate 3') {
                            scores[prefix + compProperties[i] + '+' + compProperties[j] + '+' + compProperties[k]] = 3000 - standardDeviation([comp[prefix + compProperties[i]],
                                                                                                                                    comp[prefix + compProperties[j]],
                                                                                                                                    comp[prefix + compProperties[k]]]);
                        }
                        if (type == 'Base 3') {
                            scores[prefix + compProperties[i] + '+' + compProperties[j] + '+' + compProperties[k]] = Math.min(comp[prefix + compProperties[i]],
                                                                                                                    comp[prefix + compProperties[j]],
                                                                                                                    comp[prefix + compProperties[k]]);
                        }
                    }
                }
            }
        }
        if (type == 'Balance') {
            scores[prefix + 'Balance'] = 3000 - standardDeviation(compProperties.map((_, i) => comp[prefix + compProperties[i]]));
        }
        return scores;
    }

    function scoreChampionInComp(suggestion, _comp, type) {
        let comp = JSON.parse(JSON.stringify(_comp));
        if(suggestion !== undefined)
            comp.push(suggestion);
        const compProperties = ['CompScoreAttack', 'CompScoreCatch', 'CompScoreProtect', 'CompScoreSiege', 'CompScoreSplit'];
        const init = compProperties.reduce((sum, comp) => {
            sum[comp] = 0;
            return sum;
        }, {});
        const data = comp.map((champion) => {
            let obj = {};
            for (let prop of compProperties) {
                obj[prop] = champion[prop];
            }
            return obj;
        }).reduce((sum, champion) => {
            for (let prop of compProperties) {
                sum[prop] += champion[prop];
            }
            return sum;
        }, init);
        return expandComps(data, type);
    }

    function make_suggestions() {
        let suggestions = [
            {'Top': [], 'Jungle': [], 'Mid': [], 'ADC': [], 'Support': []},
            {'Top': [], 'Jungle': [], 'Mid': [], 'ADC': [], 'Support': []}
        ];

        const comp_team1 = Object.values(teams[0]).filter((x) => x['Champion'].length != 0);
        const comp_team2 = Object.values(teams[1]).filter((x) => x['Champion'].length != 0);

        for(let champion of Object.keys(champion_data)) {
            const championName = champion_data[champion]['Champion'];
            if (championName.length == 0) { continue; }
            for(let role of Object.keys(meta[0])) {
                suggestions[0][role].push([championName, scoreChampionInComp(champion_data[champion], comp_team1), your_champ_data_filter[0][championName][longToShort(role)], champion_data[champion]['WRScoreTotal']]);
            }
        }
        for(let champion of Object.keys(champion_data)) {
            const championName = champion_data[champion]['Champion'];
            if (championName.length == 0) { continue; }
            for(let role of Object.keys(meta[1])) {
                suggestions[1][role].push([championName, scoreChampionInComp(champion_data[champion], comp_team2), your_champ_data_filter[1][championName][longToShort(role)], champion_data[champion]['WRScoreTotal']]);
            }
        }

        for(let role of Object.keys(meta[1])) {
            suggestions[0][role] = suggestions[0][role].map((a) => {
                const championName = a[0];
                const maxCompScore = Math.max(...Object.values(a[1]));
                const score = maxCompScore*a[2]/10;
                const compType = Object.keys(a[1]).filter((comp) => a[1][comp] == maxCompScore).map((name) => name.slice('CompScore'.length).split('+').join('/')).join('<br>');
                return [championName, score, compType];
            });
            suggestions[1][role] = suggestions[1][role].map((a) => {
                const championName = a[0];
                const maxCompScore = Math.max(...Object.values(a[1]));
                const score = maxCompScore*a[2]/10;
                const compType = Object.keys(a[1]).filter((comp) => a[1][comp] == maxCompScore).map((name) => name.slice('CompScore'.length).split('+').join('/')).join('<br>');
                return [championName, score, compType];
            });
        }
        return suggestions;
    }

    function show_suggestions(suggestions) {
        let max_suggestions = 0;

        for(let role of Object.keys(meta[1])) {
            suggestions[0][role] = suggestions[0][role].filter((a) => a[1] > 0);
            suggestions[1][role] = suggestions[1][role].filter((a) => a[1] > 0);
            suggestions[0][role].sort((a, b) => -a[1]+b[1]);
            suggestions[1][role].sort((a, b) => -a[1]+b[1]);
            max_suggestions = Math.max(max_suggestions, suggestions[0][role].length, suggestions[1][role].length);
        }

        const elem = $('#suggestions');
        let html = "";
        for (let i = 0 ; i < max_suggestions ; i ++) {
            html += "<tr>";
            for (let team = 0 ; team < 2 ; team ++) {
                for (let role of Object.keys(suggestions[team])) {
                    if(suggestions[team][role].length > i) {
                        let color;
                        if (Object.values(teams[0]).filter((x) => x['Champion'] == suggestions[team][role][i][0]).length > 0 ||
                            Object.values(teams[1]).filter((x) => x['Champion'] == suggestions[team][role][i][0]).length > 0){
                            color = 'picked';
                        }
                        else {
                            color = i < 5 ? 'open' : '';
                        }
                        html += `<td colspan=${2-math} class="${color}" onclick="placeChamp(this, '${team}', '${role}');">`;
                        html += suggestions[team][role][i][0];
                        html += "</td>";
                        html += `<td class="${color}">`;
                        html += suggestions[team][role][i][2];
                        html += "</td>";
                        if(math) {
                            html += "<td>";
                            html += suggestions[team][role][i][1].toFixed(2);
                            html += "</td>";
                        }
                    }
                    if(suggestions[team][role].length == i) {
                        html += `<td colspan='3' rowspan='${max_suggestions - suggestions[team][role].length}'></td>`;
                    }
                }
            }
            html += "</tr>";
        }
        elem.html(html);
    }

    function show_analysis() {
        const comp_team1 = Object.values(teams[0]).filter((x) => x['Champion'].length != 0);
        const comp_team2 = Object.values(teams[1]).filter((x) => x['Champion'].length != 0);
        const data1 = Object.entries(scoreChampionInComp(undefined, comp_team1, 'Base 1')).map(a => [a[0], a[1] / comp_team1.length * 5]);
        const data2 = Object.entries(scoreChampionInComp(undefined, comp_team2, 'Base 1')).map(a => [a[0], a[1] / comp_team2.length * 5]);
        const analysis_team1 = Object.entries(scoreChampionInComp(undefined, comp_team1, 'Base 1')).sort((a, b) => b[1] - a[1]).map(a => [a[0], a[1] / comp_team1.length]);
        const analysis_team2 = Object.entries(scoreChampionInComp(undefined, comp_team2, 'Base 1')).sort((a, b) => b[1] - a[1]).map(a => [a[0], a[1] / comp_team2.length]);
        if(compChart !== undefined) compChart.destroy();
        compChart = new Chart(
            document.getElementById('myChart'),
            {
                type: 'radar',
                data: {
                    labels: data1.map((x) => x[0].slice('CompScore'.length)),
                    datasets: [{
                      label: 'Your team',
                      data: data1.map((x) => x[1]),
                      fill: true,
                      backgroundColor: 'rgba(54, 162, 235, 0.2)',
                      borderColor: 'rgb(54, 162, 235)',
                      pointBackgroundColor: 'rgb(54, 162, 235)',
                      pointBorderColor: '#fff',
                      pointHoverBackgroundColor: '#fff',
                      pointHoverBorderColor: 'rgb(54, 162, 235)'
                    }, {
                      label: 'Enemy team',
                      data: data2.map((x) => x[1]),
                      fill: true,
                      backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      borderColor: 'rgb(255, 99, 132)',
                      pointBackgroundColor: 'rgb(255, 99, 132)',
                      pointBorderColor: '#fff',
                      pointHoverBackgroundColor: '#fff',
                      pointHoverBorderColor: 'rgb(255, 99, 132)'
                    }],
                },
                options: chartOptions,
                plugins: [chartBgPlugin]
            }
        );
        console.log(analysis_team1, analysis_team2);
        $('#analysis').html('');
        for (let i = 0 ; i < 5 ; i += 1) {
            $('#analysis').html($('#analysis').html() + `<tr>
                <td>${i + 1}</td>
                <td>${analysis_team1[i][0].slice('CompScore'.length)}</td>
                <td>${analysis_team1[i][1]}</td>
                <td>${analysis_team2[i][0].slice('CompScore'.length)}</td>
                <td>${analysis_team2[i][1]}</td>
            </tr>`)
        }
    }

    function refresh() {
        for (let role in teams[0]) {
            updateValue(`game_${role}_diff_early`, Math.round((teams[0][role]['WRScoreEarly'] - teams[1][role]['WRScoreEarly'])*100)/100, '');
            updateValue(`game_${role}_diff_mid`  , Math.round((teams[0][role]['WRScoreMid']   - teams[1][role]['WRScoreMid']  )*100)/100, '');
            updateValue(`game_${role}_diff_late` , Math.round((teams[0][role]['WRScoreLate']  - teams[1][role]['WRScoreLate'] )*100)/100, '');
        }
        updateValue(`game_team_diff_early`, Math.round(Object.keys(teams[0]).map((role) => teams[0][role]['WRScoreEarly'] - teams[1][role]['WRScoreEarly']).reduce((sum, val) => sum + val, 0)*100)/100, '');
        updateValue(`game_team_diff_mid`  , Math.round(Object.keys(teams[0]).map((role) => teams[0][role]['WRScoreMid']   - teams[1][role]['WRScoreMid']  ).reduce((sum, val) => sum + val, 0)*100)/100, '');
        updateValue(`game_team_diff_late` , Math.round(Object.keys(teams[0]).map((role) => teams[0][role]['WRScoreLate']  - teams[1][role]['WRScoreLate'] ).reduce((sum, val) => sum + val, 0)*100)/100, '');
        show_suggestions(make_suggestions());
        show_analysis();
        determineWinner();
    }    
    
    function init() {
        $.ajax({
            url: "./data/champ_scores.tsv",
            type: "GET",
            beforeSend: function() {
                $('.modal').show();
            },
            success: function (data) {
                data = data.toString();
                let champion_list = PSV.parse(data).filter((x) => x['Champion'].length != 0);
                champion_data = champion_list.reduce((obj, champion) => {
                    const championName = champion['Champion'];
                    const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
                    const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
                    obj[tag] = champion;
                    return obj;
                }, {});
                let champion_options = `<option value=""></option>`;
                for (let champion of champion_list) {
                    const championName = champion['Champion'];
                    const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
                    const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
                    champion_options += `<option value="${tag}">${championName}</option>`;
                }
                for (let select of $('.select_champion')) {
                    $(select).html(champion_options);
                }
                champion_data[''] = {'Champion': ''};
                for (let attr of Object.keys(champion_list[0])) {
                    if (attr != 'Champion') {
                        champion_data[''][attr] = champion_list.map((x) => x[attr]).reduce((sum, value) => sum + value, 0) / champion_list.length; 
                    }
                }
                champion_data['']['WRScoreEarly'] = 33.3;
                champion_data['']['WRScoreMid'] = 33.3;
                champion_data['']['WRScoreLate'] = 33.3;

                for (let team in teams) {
                    for (let role in teams[team]) {
                        teams[team][role] = champion_data[''];
                    }
                }
                $.ajax({
                    url: "./data/champion_roles.tsv",
                    type: "GET",
                    beforeSend: function() {
                        $('.modal').show();
                    },
                    success: function (data) {
                        data = data.toString();
                        let champion_list = PSV.parse(data).filter((x) => x['Champion'].length != 0);
                        for (let champion of champion_list) {
                            const championName = champion['Champion'];
                            const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
                            const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
                            Object.keys(champion).forEach((role) => {
                                if(role == 'Champion') return;
                                meta[0][role][championName] = meta[1][role][championName] = champion[role];
                            });
                        }
                        for (let champion of champion_list) {
                            const championName = champion['Champion'];
                            for (let team in teams) {
                                your_champ_data_filter[team][championName] = {};
                                for (let role in teams[team]) {
                                    your_champ_data_filter[team][championName][role] = 3 * Math.pow(meta[team][shortToLong(role)][championName], 2);
                                }
                            }
                        } 
                    },
                    error: function (xhr, status) {
                        console.log(xhr, status);
                    },
                    complete: function (xhr, status) {
                        refresh();

                        $('#comp_type').change(function() {
                            $('.modal').show();
                            refresh();
                            $('.modal').hide();
                        });
                    
                        $('.select_player').change(function() {
                            $('.modal').show();
                            const element = $(this);
                            const player = element.val();
                            const team = parseInt($(this).attr('id').slice(4, 5)) - 1;
                            const role = element.attr('id').slice(6, -('_player'.length));
                            const longRole = shortToLong(element.attr('id').slice(6, -('_player'.length)));
                    
                            Object.keys(champion_data).forEach((champion) => {
                                if(champion.length > 0) {
                                    const championName = champion_data[champion]['Champion'];
                                    your_champ_data_filter[team][championName][role] = Math.pow(meta[team][longRole][championName], 2) * comfort[player][championName];
                                }
                            });
                    
                            refresh();
                            $('.modal').hide();
                        });
                    
                        $('.select_champion').change(function() {
                            $('.modal').show();
                            const element = $(this);
                            const champion = element.val();
                            const team = parseInt($(this).attr('id').slice(4, 5)) - 1;
                            const role = $(this).attr('id').slice(6, -('_champion'.length));
                            teams[team][role] = champion_data[champion];
                            refresh();
                            $('.modal').hide();
                        });
                    
                        $('input[type=file]').change(async function(event) {
                            $('.modal').show();
                            const teamId = $(this).attr('id');
                            const team = parseInt(teamId.slice(-1)) - 1;
                            const file = event.target.files.item(0)
                            const text = await file.text();
                            
                            const data = PSV.parse(text).filter((x) => x['Champion'].length != 0); 
                            const headers = Object.keys(data[0]);
                            const players = headers.slice(1, -5);
                            const positions = headers.slice(-5);

                            console.log(positions, players);
                            
                            // comfort fill
                            comfort = players.map((player) => {
                                let playerObj = {};
                                playerObj[player] = data.map((row) => {
                                    let obj = {};
                                    obj[row['Champion']] = row[player];
                                    return obj;
                                }).reduce((obj, row) => Object.assign(obj, row), {});
                                return playerObj;
                            }).reduce((obj, row) => Object.assign(obj, row), {});
                    
                            // meta fill
                            meta[team] = Object.keys(meta[team]).map((role) => {
                                let obj = {};
                                obj[role] = data.map((row) => {
                                    let rowObj = {};
                                    rowObj[row['Champion']] = row[role];
                                    return rowObj;
                                }).reduce((obj, row) => Object.assign(obj, row), {});
                                return obj;
                            }).reduce((obj, row) => Object.assign(obj, row), {});
                    
                            const player_options = players.map((player) => `<option val='${player}'>${player}</option>`).join('');
                            for (let role of Object.keys(teams[0])) {
                                $(`select#${teamId}_${role}_player`).html(player_options);
                                $(`select#${teamId}_${role}_player`).change();
                            }
                    
                            console.log(team, teams);
                            console.log(champion_data);
                            console.log(players, 'comfort:', comfort);
                            console.log(players, 'meta:', meta);
                            console.log(players, 'your_champ_data_filter:', your_champ_data_filter);
                            console.log(players, 'positions:', positions);
                    
                            refresh();
                            $('.modal').hide();
                        });

                        $('#math').change(function() {
                            $('.modal').show();
                            math = this.checked;
                            refresh();
                            $('.modal').hide();
                        });

                        $('#reset').click(function() {
                            $('.modal').show();

                            $(".select_champion").prop('selectedIndex',0);
                            $(".select_champion").trigger("change");
                            
                            refresh();
                            $('.modal').hide();
                        });

                        $('#test').click(function() {
                            $('.modal').show();
                            const elems = $(".select_champion");
                            const champs = Object.keys(champion_data).length;
                            for (let i = 0 ; i < elems.length ; i += 1) {
                                $(elems[i]).prop('selectedIndex', Math.floor(Math.random() * champs) + 1);
                            }
                            $(elems).trigger("change");
                            
                            refresh();
                            $('.modal').hide();
                        });
                    }
                });
            },
            error: function (xhr, status) {
                console.log(xhr, status);
            },
            complete: function (xhr, status) {
                $('.modal').hide();
            }
        });
    }

    init();
    $('#math').trigger('change');
});