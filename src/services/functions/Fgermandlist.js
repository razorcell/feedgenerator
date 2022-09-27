const tools = require(`../tools`)

//Simplify logging
const lg = tools.lg

const { clg, typeOf } = require(`../tools`)

module.exports = {
  getGermanMissingDelistingUpdates,
}

async function getGermanMissingDelistingUpdates(source, log_tab) {
  try {
    lg(`START - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    // start_date = moment(start_date, 'YYYYMMDD').format('YYYY-MM-DD')
    let all_shares = await getGermanMissingGermanISINsFromWCA(source, log_tab + 1)
    lg(`END - ${tools.gFName(new Error())}`, log_tab, 'info', source)
    return all_shares
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

async function getGermanMissingGermanISINsFromWCA(source, log_tab) {
  try {
    lg(`Get all German Missing Delisted ISINs`, log_tab, 'info', source)
    let ISINs = await gWCADb.raw(
      `
          SELECT DISTINCT
            wca.scmst.SecID,
            wca.scmst.Isin,
            wca.scmst.SecurityDesc,
            wca.issur.Issuername,
            wca.issur.CntryofIncorp,
            wca.scmst.SectyCD,
            wca.scmst.PrimaryExchgCD,
            priexchg.liststatus AS PrimaryExchgListStatus,
            secexchg.ExchgCD,
            CASE
                WHEN
                    secexchg.ListStatus = 'N'
                        OR secexchg.ListStatus = 'R'
                        OR secexchg.ListStatus = ''
                THEN
                    'L'
                ELSE secexchg.ListStatus
            END AS ListStatus
          FROM
              wca.scmst
                  INNER JOIN
              wca.issur ON wca.scmst.IssID = wca.issur.IssID
                  INNER JOIN
              wca.scexh AS priexchg ON wca.scmst.SecID = priexchg.SecID
                  AND SUBSTRING(wca.scmst.primaryexchgcd,
                  1,
                  2) <> 'DE'
                  AND wca.scmst.primaryexchgcd <> ''
                  AND priexchg.liststatus = 'D'
                  INNER JOIN
              wca.scexh AS secexchg ON wca.scmst.SecID = secexchg.SecID
                  AND SUBSTRING(secexchg.exchgcd, 1, 2) = 'DE'
                  AND secexchg.liststatus <> 'D'
                  INNER JOIN
              wca.sectygrp ON wca.scmst.sectycd = wca.sectygrp.sectycd
                  AND 3 > wca.sectygrp.secgrpid
          WHERE
              secexchg.Actflag <> 'D'
                  AND priexchg.actflag <> 'D'
                  AND wca.scmst.actflag <> 'D'
                  AND wca.scmst.statusflag = 'I'
          ORDER BY secid;
          `
    )
    lg(`Extracted ${ISINs[0].length} ISINs from remote WCA DB`, log_tab, 'info', source)
    return ISINs[0]
  } catch (err) {
    tools.catchError(err, tools.gFName(new Error()), undefined, undefined, log_tab, source)
    throw new Error(err)
  }
}

/*
SELECT 
            Not_Prim_In_Germ_And_Delisted_Outside_Germ.SecID,
            Not_Prim_In_Germ_And_Delisted_Outside_Germ.ISIN,
            Not_Prim_In_Germ_And_Delisted_Outside_Germ.SecurityDesc,
            Not_Prim_In_Germ_And_Delisted_Outside_Germ.LocalCode,
            Not_Prim_In_Germ_And_Delisted_Outside_Germ.PrimaryExchgCD,
            Second_in_Germ_not_Delsited_in_Germ.ExchgCD2,
            Not_Prim_In_Germ_And_Delisted_Outside_Germ.EffectiveDate
        FROM
            (SELECT 
                scmst.Actflag AS scmstActFlag,
                    scmst.SecID,
                    scexh.Actflag AS SecExActflag,
                    scexh.ListStatus,
                    lstat.LStatStatus,
                    lstat.EffectiveDate,
                    scmst.ISIN,
                    scmst.SecurityDesc,
                    scmst.PrimaryExchgCD,
                    scexh.ExchgCD,
                    scexh.LocalCode,
                    mktsg.MktSegment,
                    mktsg.MktsgID
            FROM
                scmst
            LEFT JOIN scexh ON scmst.SecID = scexh.SecID
            LEFT JOIN mktsg ON scexh.ExchgCD = mktsg.ExchgCD
            LEFT JOIN lstat ON scmst.SecID = lstat.SecID
                AND scmst.PrimaryExchgCD = lstat.ExchgCD
            WHERE
                scmst.SectyCD IN ('EQS', 'PRF')
                    AND scmst.PrimaryExchgCD NOT IN ('DESSE' , 'DEBSE', 'DEFSX', 'DEXETR', 'DEDSE', 'DEMSE', 'DEHNSE', 'DEHSE')
                    AND scmst.PrimaryExchgCD IS NOT NULL
                    AND scmst.Actflag NOT IN ('D')
                    AND scmst.ISIN NOT IN ('')
                    AND scmst.ISIN IS NOT NULL
                    AND scexh.ListStatus IN ('D')
                    AND scexh.Actflag NOT IN ('D')
                    AND scexh.ExchgCD NOT IN ('DESSE' , 'DEBSE', 'DEFSX', 'DEXETR', 'DEDSE', 'DEMSE', 'DEHNSE', 'DEHSE')
                    AND scmst.PrimaryExchgCD = scexh.ExchgCD
                    AND lstat.EffectiveDate > '${start_date}') Not_Prim_In_Germ_And_Delisted_Outside_Germ
                INNER JOIN
            (SELECT 
                scmst.SecID AS SecID2,
                    scmst.Actflag AS scmstActFlag2,
                    scexh.ExchgCD AS ExchgCD2
            FROM
                scmst
            LEFT JOIN scexh ON scmst.SecID = scexh.SecID
            LEFT JOIN mktsg ON scexh.ExchgCD = mktsg.ExchgCD
            WHERE
                scmst.SectyCD IN ('EQS' 'PRF')
                    AND scmst.PrimaryExchgCD NOT IN ('DESSE' , 'DEBSE', 'DEFSX', 'DEXETR', 'DEDSE', 'DEMSE', 'DEHNSE', 'DEHSE')
                    AND scmst.Actflag NOT IN ('D')
                    AND scmst.ISIN NOT IN ('')
                    AND scmst.ISIN IS NOT NULL
                    AND scmst.PrimaryExchgCD IS NOT NULL
                    AND scmst.SecID IS NOT NULL
                    AND scexh.ExchgCD IN ('DESSE' , 'DEBSE', 'DEFSX', 'DEXETR', 'DEDSE', 'DEMSE', 'DEHNSE', 'DEHSE')
                    AND scexh.ListStatus NOT IN ('D')
                    AND scexh.Actflag NOT IN ('D')) Second_in_Germ_not_Delsited_in_Germ ON Not_Prim_In_Germ_And_Delisted_Outside_Germ.SecID = Second_in_Germ_not_Delsited_in_Germ.SecID2
        GROUP BY Not_Prim_In_Germ_And_Delisted_Outside_Germ.SecID , Not_Prim_In_Germ_And_Delisted_Outside_Germ.ISIN , Not_Prim_In_Germ_And_Delisted_Outside_Germ.ExchgCD
        ORDER BY Not_Prim_In_Germ_And_Delisted_Outside_Germ.EffectiveDate DESC

*/

// `
// // SELECT
// //         *
// //     FROM
// //         (SELECT
// //             scmst.SecID,
// //                 ISIN,
// //                 IssuerName,
// //                 SectyCD,
// //                 SecurityDesc,
// //                 PrimaryExchgCD,
// //                 NewLocalCode,
// //                 SharesOutstanding
// //         FROM
// //             scmst
// //         LEFT JOIN scexh ON scmst.secID = scexh.SecID
// //         LEFT JOIN issur ON scmst.IssID = issur.IssID
// //         LEFT JOIN lcc ON (scmst.SecID = lcc.SecID
// //             AND lcc.ExchgCD = PrimaryExchgCD)
// //         WHERE
// //             SectyCD IN ('EQS')
// //                 AND PrimaryExchgCD IN ('DESSE' , 'DEBSE', 'DEFSX', 'DEXETR', 'DEDSE', 'DEMSE', 'DEHNSE', 'DEHSE')
// //                 AND scmst.Actflag NOT IN ('D')
// //                 AND ISIN NOT IN ('')
// //                 AND ISIN IS NOT NULL
// //         ORDER BY lcc.Acttime DESC
// //         LIMIT 999999999) Tmp
// //     GROUP BY SecID`
