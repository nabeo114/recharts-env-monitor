import React, { useEffect, useState } from 'react';
import { InfluxDB } from '@influxdata/influxdb-client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import config from '../config'; // 設定ファイルをインポート

interface ChartData {
  time: number;
  value: number;
}

const App: React.FC = () => {
  // 各データの状態管理 (温度、湿度、圧力)
  const [temperatureData, setTemperatureData] = useState<ChartData[]>([]);
  const [humidityData, setHumidityData] = useState<ChartData[]>([]);
  const [pressureData, setPressureData] = useState<ChartData[]>([]);
  // ローディング状態とエラー状態の管理
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // InfluxDB接続設定
  const { url, org, bucket, token } = config.influxDB;

  // 汎用的なデータ取得関数
  const fetchInfluxData = async (field: string, setData: React.Dispatch<React.SetStateAction<ChartData[]>>) => {
    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

    // クエリ文 (例: 過去24時間のデータを取得)
    const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "ac_remote" and r.client_id == "ESP32Client-4f1da0d8")
        |> filter(fn: (r) => r._field == "${field}")
        |> aggregateWindow(every: 5m, fn: mean)
        |> yield(name: "mean")
    `;

    try {
      const results: ChartData[] = [];
      queryApi.queryRows(fluxQuery, {
        // クエリの各行を処理する
        next: (row, tableMeta) => {
          const obj = tableMeta.toObject(row); // 行データをオブジェクトに変換
          results.push({
            time: new Date(obj._time).getTime(), // 時間をUNIXタイムスタンプに変換
            value: obj._value, // 値を取得
          });
        },
        // エラーが発生した場合の処理
        error: (err) => {
          console.error(`Query Error for ${field}:`, err);
          setError(true);
        },
        // クエリ完了後にデータをセットする
        complete: () => {
          setData(results);
        },
      });
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      setError(true);
    }
  };

  // コンポーネントがマウントされた時とインターバルでデータを取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 温度、湿度、圧力のデータを並行して取得
        await Promise.all([
          fetchInfluxData('temperature', setTemperatureData),
          fetchInfluxData('humidity', setHumidityData),
          fetchInfluxData('pressure', setPressureData)
        ]);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // 初回データ取得
    const interval = setInterval(fetchData, 60000); // 60秒ごとにデータを再取得

    return () => clearInterval(interval); // コンポーネントアンマウント時にインターバルをクリア
  }, []);

  // 最新のデータ値を取得する関数
  const getLatestValue = (data: ChartData[]) => {
    if (data.length === 0) return 'N/A'; // データがない場合のフォールバック値
    const latestData = data[data.length - 1]; // 最新のデータを取得
    return latestData.value != null ? latestData.value.toFixed(1) : 'N/A'; // 値を安全に確認
  };

  // グラフの描画
  const renderChart = (title: string, data: ChartData[], color: string, fillColor: string, unit: string) => {
    const latestValue = getLatestValue(data);
    return (
      <div style={{ flex: 1, margin: '0 10px' }}>
        <h2 style={{ fontSize: '20px'}}>{title}</h2>
        {latestValue !== 'N/A' ? (
          <p style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px', backgroundColor: fillColor, padding: '10px', borderRadius: '8px' }}>
            {latestValue} {unit}
          </p>
        ) : (
          <p style={{ textAlign: 'center', fontStyle: 'italic' }}>No data available</p> // データがない場合の表示
        )}
        {/* グラフの描画 */}
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(tick) =>
                new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // 時分のみ表示
              }
            />
            <YAxis 
              domain={['auto', 'auto']} 
              tickFormatter={(value) => `${value} ${unit}`} // 単位を付けて表示
            />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleTimeString()} // 時間をフォーマットして表示
              formatter={(value: number) => `${value.toFixed(1)} ${unit}`} // 値を1桁に丸めて表示
            />
            <Area type="monotone" dataKey="value" stroke={color} fill={fillColor} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ENV Monitor</h1>
      {loading ? (
        <p>データを読み込んでいます...</p> // ローディング中のメッセージ
      ) : error ? (
        <p>データの取得に失敗しました。</p> // エラー時のメッセージ
      ) : (
        <>
        {/* 最終更新時間の表示 */}
        <p style={{ textAlign: 'right', fontStyle: 'italic', marginBottom: '20px' }}>
          Updated at: {temperatureData.length > 0 
            ? new Date(temperatureData[temperatureData.length - 1].time).toLocaleString() 
            : 'N/A'}
        </p>
        {/* 各グラフを横並びで表示 */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {renderChart('Temperature', temperatureData, '#8884d8', 'rgba(136, 132, 216, 0.3)', '℃')}
          {renderChart('Humidity', humidityData, '#ff7300', 'rgba(255, 115, 0, 0.3)', '%')}
          {renderChart('Pressure', pressureData, '#82ca9d', 'rgba(130, 202, 157, 0.3)', 'hPa')}
        </div>
        </>
      )}
    </div>
  );
};

export default App;
