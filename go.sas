%stpbegin; 
%maspinit; 
 
LIBNAME CMDM ORACLE  DB_LENGTH_SEMANTICS_BYTE=NO DBCLIENT_MAX_BYTES=1 DB_OBJECTS=ALL  PATH=KCLIRCT  SCHEMA=ADMIN_DATAMART  USER=ADMIN_DATAMART  PASSWORD="Uq2L+oi+95PML5" ;
%put &TASKCD.;
%put &TASKNAME.;

%put &Id_template.;
proc import datafile="/sasdata/CMS/Export/sas_input_5_&TASKCD..csv" 
        out=out_&TASKCD.
        dbms=csv
        replace;
	getnames=yes;
    delimiter=',';

run;

proc sql;
create table out_&TASKCD. as 
select "&Id_template." as ID_TEMPLATE,compress("212"||telephone)as TELEPHONE, TIERS ,compress(tsk_cd||TSK_OCCUR_NUM)as RTC, 0 as TMK_ITERATIVE_FLAG 

from out_&TASKCD.;run;

%let now=%sysfunc(datetime());

%let dt=%sysfunc(putn(&now,B8601DN8));

%put &dt ;

proc sql;
select distinct rtc into :rtc from out_&TASKCD.;run;
%put &rtc.;
%let rtc1=%sysfunc(compress(&rtc));
%put &rtc1.;
%ds2csv(data=out_&TASKCD., runmode=b , csvfile="/sasdata/batch_files/input_files/sas_input_&rtc1._3_&dt..csv",sepchar=7c , colhead=Y, labels=N);

/****count cible*****/
proc sql;
select count(*)  into :nbre from out_&TASKCD.;run;

/**************insert notif in oracle*************************/
 LIBNAME CDM ORACLE  DB_LENGTH_SEMANTICS_BYTE=NO DBCLIENT_MAX_BYTES=1 
DB_OBJECTS=ALL  PATH=KCLIRCT  SCHEMA=ADMIN_CDMUDM  USER=ADMIN_CDMUDM  
PASSWORD="Zv70!7z!00lKP0" ;
  proc sql;

  insert into CDM.SAS_INPUT_Notif
  (date_sent, rtc,flag,exec_type,file_name,camp_category,cible,taskd)
  select distinct
  datetime()as date_sent,
 rtc as rtc,
 3,
  'APVocal_NonIteratif'as exec_type,
  "sas_input_"||"&rtc1."||"_3_"||"&dt."||".csv" as file_name,
  "&camp_type.",
  &nbre. as cible,
  "&TASKCD."
  from out_&TASKCD.
;run;
proc printto; 
run; 
/*
data &outTable;
set &inTable;
run;*/
%macount(out_&TASKCD.);
%mastatus(&_stpwork.status.txt); 
%stpend;