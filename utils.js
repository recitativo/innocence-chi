// Copyright 2018 recitativo
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////////
// Utils.js

exports = {
  // Generate timestamp string
  getTimestamp: function(type, dateObj){
    let now = new Date();
    if(dateObj){
      now = dateObj;
    }
    let YYYY = String("0000" + now.getFullYear()).slice(-4);
    let MM = String("00" + (now.getMonth() + 1)).slice(-2);
    let DD = String("00" + now.getDate()).slice(-2);
    let hh = String("00" + now.getHours()).slice(-2);
    let mm = String("00" + now.getMinutes()).slice(-2);
    let ss = String("00" + now.getSeconds()).slice(-2);
    let ms = String("000" + now.getMilliseconds()).slice(-3);
    switch(type){
      case "time":
        return hh + ":" + mm + ":" + ss;
      case "date":
        return YYYY + "/" + MM + "/" + DD;
      case "datetime":
        return YYYY + "/" + MM + "/" + DD + " " + hh + ":" + mm + ":" + ss;
      case "ms":
        return YYYY + MM + DD + hh + mm + ss + ms;
      default:
        return YYYY + MM + DD + hh + mm + ss;
    }
  },
  // Load timestamp string
  loadTimestamp: function(type, str){
    let now = new Date();
    let YYYY, MM, DD, hh, mm, ss, ms;
    switch(type){
      case "time":
        YYYY = now.getFullYear();
        MM = now.getMonth() + 1;
        DD = now.getDate();
        hh = parseInt(str.split(":")[0], 10);
        mm = parseInt(str.split(":")[1], 10);
        ss = parseInt(str.split(":")[2], 10);
        ms = 0;
        break;
      case "date":
        YYYY = parseInt(str.split("/")[0], 10);
        MM = parseInt(str.split("/")[1], 10);
        DD = parseInt(str.split("/")[2], 10);
        hh = 0;
        mm = 0;
        ss = 0;
        ms = 0;
        break;
      case "datetime":
        let strDate = str.split(" ")[0];
        let strTime = str.split(" ")[1];
        YYYY = parseInt(strDate.split("/")[0], 10);
        MM = parseInt(strDate.split("/")[1], 10);
        DD = parseInt(strDate.split("/")[2], 10);
        hh = parseInt(strTime.split(":")[0], 10);
        mm = parseInt(strTime.split(":")[1], 10);
        ss = parseInt(strTime.split(":")[2], 10);
        ms = 0;
        break;
      case "ms":
        YYYY = parseInt(str.substr(0, 4), 10);
        MM = parseInt(str.substr(4, 2), 10);
        DD = parseInt(str.substr(6, 2), 10);
        hh = parseInt(str.substr(8, 2), 10);
        mm = parseInt(str.substr(10, 2), 10);
        ss = parseInt(str.substr(12, 2), 10);
        ms = parseInt(str.substr(14, 3), 10);
        break;
      default:
        YYYY = parseInt(str.substr(0, 4), 10);
        MM = parseInt(str.substr(4, 2), 10);
        DD = parseInt(str.substr(6, 2), 10);
        hh = parseInt(str.substr(8, 2), 10);
        mm = parseInt(str.substr(10, 2), 10);
        ss = parseInt(str.substr(12, 2), 10);
        ms = 0;
        break;
    }
    let dt = new Date();
    dt.setFullYear(YYYY, MM - 1, DD);
    dt.setHours(hh, mm, ss, ms);
    return dt;
  }
};
