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
          // _value の存在を確認し、存在しない場合は value を設定しない
          if (obj._value != null) {
            results.push({
              time: new Date(obj._time).getTime(), // 時間をUNIXタイムスタンプに変換
              value: obj._value,
            });
          } else {
            results.push({
              time: new Date(obj._time).getTime(), // 時間をUNIXタイムスタンプに変換
            } as ChartData); // TypeScript の型安全を維持
          }
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
    // 最新のデータを逆順に探索
    for (let i = data.length - 1; i >= 0; i--) {
      const value = data[i].value;
      if (value != null) {
        return value.toFixed(1); // 値を見つけたら小数点1桁で返す
      }
    }

    return 'N/A'; // すべての値がnullの場合
  };

  // グラフの描画
  const renderChart = (title: string, data: ChartData[], color: string, fillColor: string, unit: string) => {
    const latestValue = getLatestValue(data);
    return (
      <div style={{ flex: 1, margin: '0 10px' }}>
        <h2 style={{ fontSize: '20px'}}>{title}</h2>
        {latestValue !== 'N/A' ? (
          <p style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px', backgroundColor: fillColor, padding: '10px', borderRadius: '8px' }}>
            {latestValue}{unit}
          </p>
        ) : (
          <p style={{ textAlign: 'center', fontStyle: 'italic' }}>No data available</p> // データがない場合の表示
        )}
        {/* グラフの描画 */}
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(tick) => {
                const date = new Date(tick);
                return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              }}
            />
            <YAxis
              domain={['auto', 'auto']} 
              tickFormatter={(value) => `${value}${unit}`} // 単位を付けて表示
            />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).replace(/\//g, '-'); // 日本の年月日形式をハイフン区切りに変更
              }}
              formatter={(value: number) => `${value.toFixed(1)}${unit}`} // 値を1桁に丸めて表示
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
          Updated at {temperatureData.length > 0 
            ? new Date(temperatureData[temperatureData.length - 1].time).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }) 
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
